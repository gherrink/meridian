import type { CreateIssueInput, IIssueRepository, Issue, IssueFilterParams, IssueId, MilestoneId, PaginatedResult, PaginationParams, SortOptions, UpdateIssueInput } from '@meridian/core'

import type { GitHubRepoConfig } from './github-repo-config.js'
import type { GitHubIssueResponse } from './mappers/issue-mapper.js'

import { CreateIssueInputSchema, NotFoundError } from '@meridian/core'

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
  private readonly issueNumberCache = new Map<IssueId, number>()
  private readonly milestoneNumberCache = new Map<MilestoneId, number>()
  private readonly deletedIssueIds = new Set<IssueId>()
  private milestoneCachePopulated = false
  private issueCachePopulated = false

  constructor(octokit: OctokitInstance, config: GitHubRepoConfig) {
    this.octokit = octokit
    this.config = config
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
      const response = await this.octokit.rest.issues.create(createParams)
      const createdNumber = response.data.number
      const createdGlobalId = (response.data as unknown as { id: number }).id

      if (useNativeSubIssues && parentGitHubNumber !== undefined) {
        await this.addSubIssueToParent(parentGitHubNumber, createdGlobalId)
      }

      const parentIssueNumber = useNativeSubIssues ? parentGitHubNumber : undefined
      const issue = toDomain(response.data, this.config, { parentIssueNumber })
      this.cacheIssueNumber(issue.id, createdNumber)
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

      this.issueNumberCache.delete(id)
      this.deletedIssueIds.add(id)
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

      const queryParams = this.buildListParams(filter, pagination, sort)
      const response = await this.octokit.rest.issues.listForRepo(queryParams)

      const issues = response.data
        .filter(item => !('pull_request' in item))
        .map(item => toDomain(item, this.config))

      for (const issue of issues) {
        const githubNumber = issue.metadata?.['github_number']
        if (typeof githubNumber === 'number') {
          this.cacheIssueNumber(issue.id, githubNumber)
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
    this.cacheIssueNumber(issueId, githubNumber)
  }

  populateMilestoneCache(milestoneId: MilestoneId, milestoneNumber: number): void {
    this.milestoneNumberCache.set(milestoneId, milestoneNumber)
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
      // Native sub-issues not available; parent comment fallback was already
      // handled in toCreateParams when useNativeSubIssues is false
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
      // Best-effort removal; native API may not be available
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
    if (this.deletedIssueIds.has(id)) {
      return undefined
    }

    const cachedNumber = this.issueNumberCache.get(id)
    if (cachedNumber !== undefined) {
      return cachedNumber
    }

    if (this.issueCachePopulated) {
      return undefined
    }

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
          this.cacheIssueNumber(issue.id, item.number)
        }

        hasMorePages = items.length === ISSUES_PER_PAGE
        page++
      }

      this.issueCachePopulated = true
    }
    catch (error) {
      throw mapGitHubError(error)
    }

    return this.issueNumberCache.get(id)
  }

  private async ensureMilestoneCached(milestoneId: MilestoneId): Promise<number | undefined> {
    const cachedNumber = this.milestoneNumberCache.get(milestoneId)
    if (cachedNumber !== undefined) {
      return cachedNumber
    }

    if (this.milestoneCachePopulated) {
      return undefined
    }

    if (this.octokit.rest.issues.listMilestones === undefined) {
      return undefined
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
        this.milestoneNumberCache.set(id, githubMilestone.number)
      }

      this.milestoneCachePopulated = true
    }
    catch (error) {
      throw mapGitHubError(error)
    }

    return this.milestoneNumberCache.get(milestoneId)
  }

  private cacheIssueNumber(issueId: IssueId, githubNumber: number): void {
    this.issueNumberCache.set(issueId, githubNumber)
  }

  private async searchIssues(
    filter: IssueFilterParams,
    pagination: PaginationParams,
    sort?: SortOptions,
  ): Promise<PaginatedResult<Issue>> {
    const searchQuery = this.buildSearchQuery(filter)

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
        this.cacheIssueNumber(issue.id, githubNumber)
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
