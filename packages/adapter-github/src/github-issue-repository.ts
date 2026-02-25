import type { CreateIssueInput, IIssueRepository, ILogger, Issue, IssueFilterParams, IssueId, MilestoneId, PaginatedResult, PaginationParams, SortOptions, UpdateIssueInput } from '@meridian/core'

import type { GitHubRepoConfig } from './github-repo-config.js'
import type { GitHubIssueResponse } from './mappers/issue-mapper.js'

import { CreateIssueInputSchema, NotFoundError, NullLogger } from '@meridian/core'

import { GitHubNumberCache } from './github-number-cache.js'
import { generateDeterministicId, MILESTONE_ID_NAMESPACE } from './mappers/deterministic-id.js'
import { mapGitHubError } from './mappers/error-mapper.js'
import { normalizeLabels, toCreateParams, toDomain, toUpdateParams } from './mappers/issue-mapper.js'
import { parseTotalFromLinkHeader } from './mappers/pagination-utils.js'

interface SearchResponseItem extends GitHubIssueResponse {
  pull_request?: unknown
}

interface OctokitInstance {
  rest: {
    issues: {
      create: (params: Record<string, unknown>) => Promise<{ data: GitHubIssueResponse }>
      get: (params: { owner: string, repo: string, issue_number: number }) => Promise<{ data: GitHubIssueResponse }>
      update: (params: Record<string, unknown>) => Promise<{ data: GitHubIssueResponse }>
      listForRepo: (params: Record<string, unknown>) => Promise<{
        data: GitHubIssueResponse[]
        headers: Record<string, string | undefined>
      }>
      listMilestones?: (params: Record<string, unknown>) => Promise<{
        data: Array<{ number: number, title: string }>
        headers: Record<string, string | undefined>
      }>
    }
  }
  request: (route: string, params?: Record<string, unknown>) => Promise<{
    data: unknown
    headers?: Record<string, string | undefined>
  }>
}

const ISSUES_PER_PAGE = 100

export class GitHubIssueRepository implements IIssueRepository {
  private readonly octokit: OctokitInstance
  private readonly config: GitHubRepoConfig
  private readonly logger: ILogger
  private readonly cache: GitHubNumberCache
  private issueStaleRetryDone = false
  private milestoneStaleRetryDone = false

  constructor(octokit: OctokitInstance, config: GitHubRepoConfig)
  constructor(octokit: OctokitInstance, config: GitHubRepoConfig, logger: ILogger)
  constructor(octokit: OctokitInstance, config: GitHubRepoConfig, cache: GitHubNumberCache, logger?: ILogger)
  constructor(octokit: OctokitInstance, config: GitHubRepoConfig, cacheOrLogger?: GitHubNumberCache | ILogger, logger?: ILogger) {
    this.octokit = octokit
    this.config = config

    if (cacheOrLogger instanceof GitHubNumberCache) {
      this.cache = cacheOrLogger
      const baseLogger = logger ?? new NullLogger()
      this.logger = baseLogger.child({ adapter: 'github', owner: config.owner, repo: config.repo, repository: 'issue' })
    }
    else {
      this.cache = new GitHubNumberCache()
      const baseLogger = cacheOrLogger ?? new NullLogger()
      this.logger = baseLogger.child({ adapter: 'github', owner: config.owner, repo: config.repo, repository: 'issue' })
    }
  }

  create = async (input: CreateIssueInput): Promise<Issue> => {
    const parsed = CreateIssueInputSchema.parse(input)

    const parentGitHubNumber = parsed.parentId
      ? await this.ensureIssueCached(parsed.parentId as IssueId)
      : undefined

    const milestoneGitHubNumber = parsed.milestoneId
      ? await this.ensureMilestoneCached(parsed.milestoneId as MilestoneId)
      : undefined

    const useNativeSubIssues = parentGitHubNumber !== undefined
    const createParams = toCreateParams(parsed, this.config, {
      parentGitHubNumber,
      milestoneGitHubNumber,
      useNativeSubIssues,
    })

    try {
      this.logger.info('Creating GitHub issue', { operation: 'create', title: parsed.title })
      const response = await this.octokit.rest.issues.create(createParams)
      const createdNumber = response.data.number
      const createdGlobalId = (response.data as unknown as { id: number }).id

      if (useNativeSubIssues && parentGitHubNumber !== undefined) {
        await this.addSubIssueToParent(parentGitHubNumber, createdGlobalId)
      }

      const parentIssueNumber = useNativeSubIssues ? parentGitHubNumber : undefined
      const issue = toDomain(response.data, this.config, { parentIssueNumber })
      this.cache.setIssue(issue.id, createdNumber)
      this.logger.info('Created GitHub issue', { operation: 'create', issueNumber: createdNumber, issueId: issue.id })
      return issue
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  getById = async (id: IssueId): Promise<Issue> => {
    const issueNumber = await this.ensureIssueCached(id)

    if (issueNumber === undefined) {
      throw new NotFoundError('Issue', id)
    }

    try {
      this.logger.debug('Fetching GitHub issue', { operation: 'getById', issueId: id, issueNumber })
      const response = await this.octokit.rest.issues.get({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
      })

      const parentIssueNumber = await this.fetchParentIssueNumber(issueNumber)
      const issue = toDomain(response.data, this.config, { parentIssueNumber })
      return issue
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  update = async (id: IssueId, input: UpdateIssueInput): Promise<Issue> => {
    const issueNumber = await this.ensureIssueCached(id)

    if (issueNumber === undefined) {
      throw new NotFoundError('Issue', id)
    }

    try {
      this.logger.info('Updating GitHub issue', { operation: 'update', issueId: id, issueNumber })
      const currentResponse = await this.octokit.rest.issues.get({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
      })

      const currentLabels = normalizeLabels(currentResponse.data.labels)
      const currentBody = currentResponse.data.body ?? ''

      const parentGitHubNumber = input.parentId
        ? await this.ensureIssueCached(input.parentId as IssueId)
        : undefined

      const useNativeSubIssues = input.parentId !== undefined
      const updateParams = toUpdateParams(input, issueNumber, this.config, currentLabels, {
        parentGitHubNumber,
        currentBody,
        useNativeSubIssues,
      })

      if (input.parentId !== undefined) {
        await this.updateParentRelationship(issueNumber, input.parentId as IssueId | null)
      }

      const response = await this.octokit.rest.issues.update(updateParams)

      const parentIssueNumber = useNativeSubIssues
        ? (input.parentId === null ? undefined : parentGitHubNumber)
        : undefined
      const issue = toDomain(response.data, this.config, { parentIssueNumber })
      return issue
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  delete = async (id: IssueId): Promise<void> => {
    const issueNumber = await this.ensureIssueCached(id)

    if (issueNumber === undefined) {
      throw new NotFoundError('Issue', id)
    }

    try {
      this.logger.info('Deleting GitHub issue (closing with deleted label)', { operation: 'delete', issueId: id, issueNumber })
      const currentResponse = await this.octokit.rest.issues.get({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
      })

      const existingLabels = normalizeLabels(currentResponse.data.labels)
      const labelNames = existingLabels.map(label => label.name ?? '')
      if (!labelNames.includes('deleted')) {
        labelNames.push('deleted')
      }

      await this.octokit.rest.issues.update({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        state: 'closed',
        labels: labelNames,
      })

      this.cache.deleteIssue(id)
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  list = async (
    filter: IssueFilterParams,
    pagination: PaginationParams,
    sort?: SortOptions,
  ): Promise<PaginatedResult<Issue>> => {
    try {
      if (filter.search !== undefined && filter.search.trim() !== '') {
        return await this.searchIssues(filter, pagination, sort)
      }

      this.logger.debug('Listing GitHub issues', { operation: 'list', page: pagination.page, limit: pagination.limit })
      const queryParams = this.buildListParams(filter, pagination, sort)
      const response = await this.octokit.rest.issues.listForRepo(queryParams)

      const issues = response.data
        .filter(item => !('pull_request' in item))
        .map(item => toDomain(item, this.config))

      for (const issue of issues) {
        const githubNumber = issue.metadata?.['github_number']
        if (typeof githubNumber === 'number') {
          this.cache.setIssue(issue.id, githubNumber)
        }
      }

      const totalCount = parseTotalFromLinkHeader(response.headers['link'], issues.length, pagination)

      return {
        items: issues,
        total: totalCount,
        page: pagination.page,
        limit: pagination.limit,
        hasMore: issues.length === pagination.limit,
      }
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  populateCache(issueId: IssueId, githubNumber: number): void {
    this.cache.setIssue(issueId, githubNumber)
  }

  populateMilestoneCache(milestoneId: MilestoneId, milestoneNumber: number): void {
    this.cache.setMilestone(milestoneId, milestoneNumber)
  }

  private async addSubIssueToParent(parentNumber: number, childGlobalId: number): Promise<void> {
    try {
      await this.octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: parentNumber,
        sub_issue_id: childGlobalId,
      })
    }
    catch {
      this.logger.warn('Native sub-issues API not available, skipping sub-issue attachment', {
        operation: 'addSubIssueToParent',
        parentNumber,
      })
    }
  }

  private async removeSubIssueFromParent(parentNumber: number, childGlobalId: number): Promise<void> {
    try {
      await this.octokit.request('DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue', {
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: parentNumber,
        sub_issue_id: childGlobalId,
      })
    }
    catch {
      this.logger.warn('Failed to remove sub-issue from parent, native API may not be available', {
        operation: 'removeSubIssueFromParent',
        parentNumber,
      })
    }
  }

  private async updateParentRelationship(issueNumber: number, newParentId: IssueId | null): Promise<void> {
    const issueGlobalId = await this.fetchIssueGlobalId(issueNumber)
    if (issueGlobalId === undefined) {
      return
    }

    if (newParentId === null) {
      const currentParentNumber = await this.fetchParentIssueNumber(issueNumber)
      if (currentParentNumber !== undefined) {
        await this.removeSubIssueFromParent(currentParentNumber, issueGlobalId)
      }
      return
    }

    const newParentNumber = await this.ensureIssueCached(newParentId)
    if (newParentNumber !== undefined) {
      await this.addSubIssueToParent(newParentNumber, issueGlobalId)
    }
  }

  private async fetchParentIssueNumber(issueNumber: number): Promise<number | undefined> {
    try {
      const response = await this.octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/parent', {
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        request: { retries: 0 },
      })

      const data = response.data
      if (data !== null && typeof data === 'object' && 'number' in (data as Record<string, unknown>)) {
        return (data as { number: number }).number
      }
      return undefined
    }
    catch {
      this.logger.debug('Could not fetch parent issue number, sub-issues API may not be available', {
        operation: 'fetchParentIssueNumber',
        issueNumber,
      })
      return undefined
    }
  }

  private async fetchIssueGlobalId(issueNumber: number): Promise<number | undefined> {
    try {
      const response = await this.octokit.rest.issues.get({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
      })
      return (response.data as unknown as { id: number }).id
    }
    catch {
      return undefined
    }
  }

  private async ensureIssueCached(id: IssueId): Promise<number | undefined> {
    if (this.cache.isIssueDeleted(id)) {
      return undefined
    }

    const cachedNumber = this.cache.getIssue(id)
    if (cachedNumber !== undefined) {
      return cachedNumber
    }

    if (this.cache.issuesBulkLoaded) {
      if (this.issueStaleRetryDone) {
        return undefined
      }
      this.issueStaleRetryDone = true
      this.cache.resetIssuesBulkLoaded()
      await this.bulkLoadAllIssues()
      return this.cache.getIssue(id)
    }

    await this.bulkLoadAllIssues()
    this.issueStaleRetryDone = true
    return this.cache.getIssue(id)
  }

  private async bulkLoadAllIssues(): Promise<void> {
    try {
      let page = 1
      let hasMorePages = true

      while (hasMorePages) {
        const response = await this.octokit.rest.issues.listForRepo({
          owner: this.config.owner,
          repo: this.config.repo,
          state: 'all',
          per_page: ISSUES_PER_PAGE,
          page,
        })

        const items = response?.data
        if (!Array.isArray(items)) {
          break
        }

        for (const item of items) {
          if ('pull_request' in item) {
            continue
          }
          const issue = toDomain(item, this.config)
          this.cache.setIssue(issue.id, item.number)
        }

        hasMorePages = items.length === ISSUES_PER_PAGE
        page++
      }

      this.cache.markIssuesBulkLoaded()
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  private async ensureMilestoneCached(milestoneId: MilestoneId): Promise<number | undefined> {
    const cachedNumber = this.cache.getMilestone(milestoneId)
    if (cachedNumber !== undefined) {
      return cachedNumber
    }

    if (this.octokit.rest.issues.listMilestones === undefined) {
      return undefined
    }

    if (this.cache.milestonesBulkLoaded) {
      if (this.milestoneStaleRetryDone) {
        return undefined
      }
      this.milestoneStaleRetryDone = true
      this.cache.resetMilestonesBulkLoaded()
      await this.bulkLoadAllMilestones()
      return this.cache.getMilestone(milestoneId)
    }

    await this.bulkLoadAllMilestones()
    this.milestoneStaleRetryDone = true
    return this.cache.getMilestone(milestoneId)
  }

  private async bulkLoadAllMilestones(): Promise<void> {
    if (this.octokit.rest.issues.listMilestones === undefined) {
      return
    }

    try {
      const response = await this.octokit.rest.issues.listMilestones({
        owner: this.config.owner,
        repo: this.config.repo,
        state: 'all',
        per_page: 100,
      })

      for (const githubMilestone of response.data) {
        const id = generateDeterministicId(MILESTONE_ID_NAMESPACE, `${this.config.owner}/${this.config.repo}#${githubMilestone.number}`) as MilestoneId
        this.cache.setMilestone(id, githubMilestone.number)
      }

      this.cache.markMilestonesBulkLoaded()
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  private async searchIssues(
    filter: IssueFilterParams,
    pagination: PaginationParams,
    sort?: SortOptions,
  ): Promise<PaginatedResult<Issue>> {
    const searchQuery = this.buildSearchQuery(filter)

    this.logger.debug('Searching GitHub issues', { operation: 'search', query: searchQuery, page: pagination.page })

    const params: Record<string, unknown> = {
      q: searchQuery,
      per_page: pagination.limit,
      page: pagination.page,
    }

    if (sort !== undefined) {
      const sortField = mapSortField(sort.field)
      if (sortField !== undefined) {
        params['sort'] = sortField
        params['order'] = sort.direction
      }
    }

    const response = await this.octokit.request('GET /search/issues', params)
    const responseData = response.data as { total_count: number, items: SearchResponseItem[] }

    const issues = responseData.items
      .filter(item => item.pull_request === undefined)
      .map(item => toDomain(item, this.config))

    for (const issue of issues) {
      const githubNumber = issue.metadata?.['github_number']
      if (typeof githubNumber === 'number') {
        this.cache.setIssue(issue.id, githubNumber)
      }
    }

    return {
      items: issues,
      total: responseData.total_count,
      page: pagination.page,
      limit: pagination.limit,
      hasMore: issues.length === pagination.limit,
    }
  }

  private buildSearchQuery(filter: IssueFilterParams): string {
    const qualifiers: string[] = [
      `repo:${this.config.owner}/${this.config.repo}`,
      'is:issue',
    ]

    if (filter.search !== undefined && filter.search.trim() !== '') {
      qualifiers.push(filter.search.trim())
    }

    if (filter.state === 'done') {
      qualifiers.push('is:closed')
    }
    else if (filter.state === 'open' || filter.state === 'in_progress') {
      qualifiers.push('is:open')
    }

    if (filter.assigneeId !== undefined) {
      qualifiers.push(`assignee:${filter.assigneeId}`)
    }

    if (filter.priority !== undefined) {
      qualifiers.push(`label:priority:${filter.priority}`)
    }

    if (filter.state === 'in_progress') {
      qualifiers.push('label:state:in-progress')
    }

    if (filter.status !== undefined) {
      qualifiers.push(`label:status:${filter.status}`)
    }

    return qualifiers.join(' ')
  }

  private buildListParams(
    filter: IssueFilterParams,
    pagination: PaginationParams,
    sort?: SortOptions,
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {
      owner: this.config.owner,
      repo: this.config.repo,
      per_page: pagination.limit,
      page: pagination.page,
    }

    if (filter.state === 'done') {
      params['state'] = 'closed'
    }
    else if (filter.state === 'open' || filter.state === 'in_progress') {
      params['state'] = 'open'
    }
    else {
      params['state'] = 'all'
    }

    if (filter.assigneeId !== undefined) {
      params['assignee'] = filter.assigneeId
    }

    const labels: string[] = []
    if (filter.priority !== undefined) {
      labels.push(`priority:${filter.priority}`)
    }
    if (filter.state === 'in_progress') {
      labels.push('state:in-progress')
    }
    if (filter.status !== undefined) {
      labels.push(`status:${filter.status}`)
    }
    if (labels.length > 0) {
      params['labels'] = labels.join(',')
    }

    if (sort !== undefined) {
      const sortField = mapSortField(sort.field)
      if (sortField !== undefined) {
        params['sort'] = sortField
        params['direction'] = sort.direction
      }
    }

    return params
  }
}

function mapSortField(field: string): string | undefined {
  const fieldMap: Record<string, string> = {
    createdAt: 'created',
    updatedAt: 'updated',
  }
  return fieldMap[field]
}
