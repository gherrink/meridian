import type { CreateProjectInput, IProjectRepository, PaginatedResult, PaginationParams, Project, ProjectId, SortOptions, UpdateProjectInput } from '@meridian/core'

import type { GitHubRepoConfig } from './github-repo-config.js'
import type { GitHubMilestoneResponse } from './mappers/github-types.js'
import type { OctokitMilestoneCreateParams, OctokitMilestoneUpdateParams } from './mappers/project-mapper.js'

import { CreateProjectInputSchema, NotFoundError } from '@meridian/core'

import { mapGitHubError } from './mappers/error-mapper.js'
import { parseTotalFromLinkHeader } from './mappers/pagination-utils.js'
import { toCreateParams, toDomain, toUpdateParams } from './mappers/project-mapper.js'

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

export class GitHubProjectRepository implements IProjectRepository {
  private readonly octokit: OctokitInstance
  private readonly config: GitHubRepoConfig
  private readonly milestoneNumberCache = new Map<ProjectId, number>()

  constructor(octokit: OctokitInstance, config: GitHubRepoConfig) {
    this.octokit = octokit
    this.config = config
  }

  create = async (input: CreateProjectInput): Promise<Project> => {
    const parsed = CreateProjectInputSchema.parse(input)
    const createParams = toCreateParams(parsed, this.config)

    try {
      const response = await this.octokit.rest.issues.createMilestone(createParams)
      const project = toDomain(response.data, this.config)
      this.cacheMilestoneNumber(project.id, response.data.number)
      return project
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  getById = async (id: ProjectId): Promise<Project> => {
    const milestoneNumber = this.milestoneNumberCache.get(id)

    if (milestoneNumber === undefined) {
      throw new NotFoundError('Project', id)
    }

    try {
      const response = await this.octokit.rest.issues.getMilestone({
        owner: this.config.owner,
        repo: this.config.repo,
        milestone_number: milestoneNumber,
      })

      const project = toDomain(response.data, this.config)
      return project
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  update = async (id: ProjectId, input: UpdateProjectInput): Promise<Project> => {
    const milestoneNumber = this.milestoneNumberCache.get(id)

    if (milestoneNumber === undefined) {
      throw new NotFoundError('Project', id)
    }

    const updateParams = toUpdateParams(input, milestoneNumber, this.config)

    try {
      const response = await this.octokit.rest.issues.updateMilestone(updateParams)
      const project = toDomain(response.data, this.config)
      return project
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  delete = async (id: ProjectId): Promise<void> => {
    const milestoneNumber = this.milestoneNumberCache.get(id)

    if (milestoneNumber === undefined) {
      throw new NotFoundError('Project', id)
    }

    try {
      await this.octokit.rest.issues.deleteMilestone({
        owner: this.config.owner,
        repo: this.config.repo,
        milestone_number: milestoneNumber,
      })

      this.milestoneNumberCache.delete(id)
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  list = async (pagination: PaginationParams, sort?: SortOptions): Promise<PaginatedResult<Project>> => {
    try {
      const queryParams = this.buildListParams(pagination, sort)
      const response = await this.octokit.rest.issues.listMilestones(queryParams)

      const projects = response.data.map(milestone => toDomain(milestone, this.config))

      for (let index = 0; index < response.data.length; index++) {
        const milestone = response.data[index]
        const project = projects[index]
        if (milestone !== undefined && project !== undefined) {
          this.cacheMilestoneNumber(project.id, milestone.number)
        }
      }

      const totalCount = parseTotalFromLinkHeader(response.headers['link'], projects.length, pagination)

      return {
        items: projects,
        total: totalCount,
        page: pagination.page,
        limit: pagination.limit,
        hasMore: projects.length === pagination.limit,
      }
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  populateCache(projectId: ProjectId, milestoneNumber: number): void {
    this.cacheMilestoneNumber(projectId, milestoneNumber)
  }

  private cacheMilestoneNumber(projectId: ProjectId, milestoneNumber: number): void {
    this.milestoneNumberCache.set(projectId, milestoneNumber)
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
