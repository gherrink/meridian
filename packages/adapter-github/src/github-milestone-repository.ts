import type { CreateMilestoneInput, ILogger, IMilestoneRepository, Milestone, MilestoneId, PaginatedResult, PaginationParams, SortOptions, UpdateMilestoneInput } from '@meridian/core'

import type { GitHubRepoConfig } from './github-repo-config.js'
import type { GitHubMilestoneResponse } from './mappers/github-types.js'
import type { OctokitMilestoneCreateParams, OctokitMilestoneUpdateParams } from './mappers/milestone-mapper.js'

import { CreateMilestoneInputSchema, NotFoundError, NullLogger } from '@meridian/core'

import { generateDeterministicId, MILESTONE_ID_NAMESPACE } from './mappers/deterministic-id.js'
import { mapGitHubError } from './mappers/error-mapper.js'
import { toCreateParams, toDomain, toUpdateParams } from './mappers/milestone-mapper.js'
import { parseTotalFromLinkHeader } from './mappers/pagination-utils.js'

interface OctokitInstance {
  rest: {
    issues: {
      createMilestone: (params: OctokitMilestoneCreateParams) => Promise<{ data: GitHubMilestoneResponse }>
      getMilestone: (params: { owner: string, repo: string, milestone_number: number }) => Promise<{ data: GitHubMilestoneResponse }>
      updateMilestone: (params: OctokitMilestoneUpdateParams) => Promise<{ data: GitHubMilestoneResponse }>
      deleteMilestone: (params: { owner: string, repo: string, milestone_number: number }) => Promise<void>
      listMilestones: (params: Record<string, unknown>) => Promise<{
        data: GitHubMilestoneResponse[]
        headers: Record<string, string | undefined>
      }>
    }
  }
}

export class GitHubMilestoneRepository implements IMilestoneRepository {
  private readonly octokit: OctokitInstance
  private readonly config: GitHubRepoConfig
  private readonly logger: ILogger
  private readonly milestoneNumberCache = new Map<MilestoneId, number>()
  private readonly deletedMilestoneIds = new Set<MilestoneId>()
  private milestoneCachePopulated = false

  constructor(octokit: OctokitInstance, config: GitHubRepoConfig, logger?: ILogger) {
    this.octokit = octokit
    this.config = config
    const baseLogger = logger ?? new NullLogger()
    this.logger = baseLogger.child({ adapter: 'github', owner: config.owner, repo: config.repo, repository: 'milestone' })
  }

  create = async (input: CreateMilestoneInput): Promise<Milestone> => {
    const parsed = CreateMilestoneInputSchema.parse(input)
    const createParams = toCreateParams(parsed, this.config)

    try {
      this.logger.info('Creating GitHub milestone', { operation: 'create', name: parsed.name })
      const response = await this.octokit.rest.issues.createMilestone(createParams)
      const milestone = toDomain(response.data, this.config)
      this.cacheMilestoneNumber(milestone.id, response.data.number)
      this.logger.info('Created GitHub milestone', { operation: 'create', milestoneNumber: response.data.number, milestoneId: milestone.id })
      return milestone
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  getById = async (id: MilestoneId): Promise<Milestone> => {
    const milestoneNumber = await this.ensureMilestoneCached(id)

    if (milestoneNumber === undefined) {
      throw new NotFoundError('Milestone', id)
    }

    try {
      this.logger.debug('Fetching GitHub milestone', { operation: 'getById', milestoneId: id, milestoneNumber })
      const response = await this.octokit.rest.issues.getMilestone({
        owner: this.config.owner,
        repo: this.config.repo,
        milestone_number: milestoneNumber,
      })

      const milestone = toDomain(response.data, this.config)
      return milestone
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  update = async (id: MilestoneId, input: UpdateMilestoneInput): Promise<Milestone> => {
    const milestoneNumber = await this.ensureMilestoneCached(id)

    if (milestoneNumber === undefined) {
      throw new NotFoundError('Milestone', id)
    }

    const updateParams = toUpdateParams(input, milestoneNumber, this.config)

    try {
      this.logger.info('Updating GitHub milestone', { operation: 'update', milestoneId: id, milestoneNumber })
      const response = await this.octokit.rest.issues.updateMilestone(updateParams)
      const milestone = toDomain(response.data, this.config)
      return milestone
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  delete = async (id: MilestoneId): Promise<void> => {
    const milestoneNumber = await this.ensureMilestoneCached(id)

    if (milestoneNumber === undefined) {
      throw new NotFoundError('Milestone', id)
    }

    try {
      this.logger.info('Deleting GitHub milestone', { operation: 'delete', milestoneId: id, milestoneNumber })
      await this.octokit.rest.issues.deleteMilestone({
        owner: this.config.owner,
        repo: this.config.repo,
        milestone_number: milestoneNumber,
      })

      this.milestoneNumberCache.delete(id)
      this.deletedMilestoneIds.add(id)
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  list = async (pagination: PaginationParams, sort?: SortOptions): Promise<PaginatedResult<Milestone>> => {
    try {
      this.logger.debug('Listing GitHub milestones', { operation: 'list', page: pagination.page, limit: pagination.limit })
      const queryParams = this.buildListParams(pagination, sort)
      const response = await this.octokit.rest.issues.listMilestones(queryParams)

      const milestones = response.data.map(githubMilestone => toDomain(githubMilestone, this.config))

      for (let index = 0; index < response.data.length; index++) {
        const githubMilestone = response.data[index]
        const milestone = milestones[index]
        if (githubMilestone !== undefined && milestone !== undefined) {
          this.cacheMilestoneNumber(milestone.id, githubMilestone.number)
        }
      }

      const totalCount = parseTotalFromLinkHeader(response.headers['link'], milestones.length, pagination)

      return {
        items: milestones,
        total: totalCount,
        page: pagination.page,
        limit: pagination.limit,
        hasMore: milestones.length === pagination.limit,
      }
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  populateCache(milestoneId: MilestoneId, milestoneNumber: number): void {
    this.cacheMilestoneNumber(milestoneId, milestoneNumber)
  }

  private async ensureMilestoneCached(id: MilestoneId): Promise<number | undefined> {
    if (this.deletedMilestoneIds.has(id)) {
      return undefined
    }

    const cachedNumber = this.milestoneNumberCache.get(id)
    if (cachedNumber !== undefined) {
      return cachedNumber
    }

    if (this.milestoneCachePopulated) {
      return undefined
    }

    try {
      const response = await this.octokit.rest.issues.listMilestones({
        owner: this.config.owner,
        repo: this.config.repo,
        state: 'all',
        per_page: 100,
      })

      const items = response?.data
      if (Array.isArray(items)) {
        for (const githubMilestone of items) {
          const milestoneId = generateDeterministicId(MILESTONE_ID_NAMESPACE, `${this.config.owner}/${this.config.repo}#${githubMilestone.number}`) as MilestoneId
          this.milestoneNumberCache.set(milestoneId, githubMilestone.number)
        }
      }

      this.milestoneCachePopulated = true
    }
    catch (error) {
      throw mapGitHubError(error)
    }

    return this.milestoneNumberCache.get(id)
  }

  private cacheMilestoneNumber(milestoneId: MilestoneId, milestoneNumber: number): void {
    this.milestoneNumberCache.set(milestoneId, milestoneNumber)
  }

  private buildListParams(pagination: PaginationParams, sort?: SortOptions): Record<string, unknown> {
    const params: Record<string, unknown> = {
      owner: this.config.owner,
      repo: this.config.repo,
      per_page: pagination.limit,
      page: pagination.page,
      state: 'all',
    }

    if (sort !== undefined) {
      const sortField = mapMilestoneSortField(sort.field)
      if (sortField !== undefined) {
        params['sort'] = sortField
        params['direction'] = sort.direction
      }
    }

    return params
  }
}

/**
 * Maps domain sort fields to GitHub Milestones API sort parameters.
 *
 * The GitHub Milestones API only supports two sort fields: "due_on" and "completeness".
 * Domain fields like "createdAt" and "updatedAt" have no milestone API equivalent,
 * so they return undefined and the sort parameter is omitted from the request,
 * falling through to GitHub's default sort (due_on ascending).
 */
function mapMilestoneSortField(field: string): string | undefined {
  const fieldMap: Record<string, string> = {
    dueDate: 'due_on',
    completeness: 'completeness',
  }
  return fieldMap[field]
}
