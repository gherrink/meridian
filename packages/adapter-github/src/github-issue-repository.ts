import type { CreateIssueInput, IIssueRepository, Issue, IssueFilterParams, IssueId, PaginatedResult, PaginationParams, SortOptions, UpdateIssueInput } from '@meridian/core'

import type { GitHubRepoConfig } from './github-repo-config.js'
import type { GitHubIssueResponse } from './mappers/issue-mapper.js'

import { CreateIssueInputSchema, NotFoundError } from '@meridian/core'

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
    }
    search: {
      issuesAndPullRequests: (params: Record<string, unknown>) => Promise<{
        data: {
          total_count: number
          items: SearchResponseItem[]
        }
        headers: Record<string, string | undefined>
      }>
    }
  }
}

export class GitHubIssueRepository implements IIssueRepository {
  private readonly octokit: OctokitInstance
  private readonly config: GitHubRepoConfig
  private readonly issueNumberCache = new Map<IssueId, number>()

  constructor(octokit: OctokitInstance, config: GitHubRepoConfig) {
    this.octokit = octokit
    this.config = config
  }

  create = async (input: CreateIssueInput): Promise<Issue> => {
    const parsed = CreateIssueInputSchema.parse(input)
    const createParams = toCreateParams(parsed, this.config)

    try {
      const response = await this.octokit.rest.issues.create(createParams)
      const issue = toDomain(response.data, this.config)
      this.cacheIssueNumber(issue.id, response.data.number)
      return issue
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  getById = async (id: IssueId): Promise<Issue> => {
    const issueNumber = this.issueNumberCache.get(id)

    if (issueNumber === undefined) {
      throw new NotFoundError('Issue', id)
    }

    try {
      const response = await this.octokit.rest.issues.get({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
      })

      const issue = toDomain(response.data, this.config)
      return issue
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  update = async (id: IssueId, input: UpdateIssueInput): Promise<Issue> => {
    const issueNumber = this.issueNumberCache.get(id)

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
      const updateParams = toUpdateParams(input, issueNumber, this.config, currentLabels)

      const response = await this.octokit.rest.issues.update(updateParams)
      const issue = toDomain(response.data, this.config)
      return issue
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  delete = async (id: IssueId): Promise<void> => {
    const issueNumber = this.issueNumberCache.get(id)

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
        const githubNumber = issue.metadata?.github_number
        if (typeof githubNumber === 'number') {
          this.cacheIssueNumber(issue.id, githubNumber)
        }
      }

      const totalCount = parseTotalFromLinkHeader(response.headers.link, issues.length, pagination)

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
        params.sort = sortField
        params.order = sort.direction
      }
    }

    const response = await this.octokit.rest.search.issuesAndPullRequests(params)

    const issues = response.data.items
      .filter(item => item.pull_request === undefined)
      .map(item => toDomain(item, this.config))

    for (const issue of issues) {
      const githubNumber = issue.metadata?.github_number
      if (typeof githubNumber === 'number') {
        this.cacheIssueNumber(issue.id, githubNumber)
      }
    }

    return {
      items: issues,
      total: response.data.total_count,
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

    if (filter.status === 'closed') {
      qualifiers.push('is:closed')
    }
    else if (filter.status === 'open' || filter.status === 'in_progress') {
      qualifiers.push('is:open')
    }

    if (filter.assigneeId !== undefined) {
      qualifiers.push(`assignee:${filter.assigneeId}`)
    }

    if (filter.priority !== undefined) {
      qualifiers.push(`label:priority:${filter.priority}`)
    }

    if (filter.status === 'in_progress') {
      qualifiers.push('label:status:in-progress')
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

    if (filter.status === 'closed') {
      params.state = 'closed'
    }
    else if (filter.status === 'open' || filter.status === 'in_progress') {
      params.state = 'open'
    }
    else {
      params.state = 'all'
    }

    if (filter.assigneeId !== undefined) {
      params.assignee = filter.assigneeId
    }

    const labels: string[] = []
    if (filter.priority !== undefined) {
      labels.push(`priority:${filter.priority}`)
    }
    if (filter.status === 'in_progress') {
      labels.push('status:in-progress')
    }
    if (labels.length > 0) {
      params.labels = labels.join(',')
    }

    if (sort !== undefined) {
      const sortField = mapSortField(sort.field)
      if (sortField !== undefined) {
        params.sort = sortField
        params.direction = sort.direction
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
