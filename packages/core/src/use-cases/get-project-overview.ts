import type { Issue } from '../model/issue.js'
import type { Project } from '../model/project.js'
import type { Status } from '../model/status.js'
import type { ProjectId } from '../model/value-objects.js'
import type { IIssueRepository } from '../ports/issue-repository.js'
import type { IProjectRepository } from '../ports/project-repository.js'
import type { Result } from './result.js'

import { NotFoundError } from '../errors/domain-errors.js'
import { failure, success } from './result.js'

export interface ProjectOverview {
  project: Project
  totalIssues: number
  statusBreakdown: Record<Status, number>
}

export class GetProjectOverviewUseCase {
  private readonly projectRepository: IProjectRepository
  private readonly issueRepository: IIssueRepository

  constructor(projectRepository: IProjectRepository, issueRepository: IIssueRepository) {
    this.projectRepository = projectRepository
    this.issueRepository = issueRepository
  }

  async execute(projectId: ProjectId): Promise<Result<ProjectOverview, NotFoundError>> {
    let project: Project

    try {
      project = await this.projectRepository.getById(projectId)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(error)
      }
      throw error
    }

    const allIssues = await this.fetchAllIssues(projectId)

    const statusBreakdown: Record<Status, number> = {
      open: 0,
      in_progress: 0,
      closed: 0,
    }

    for (const issue of allIssues) {
      statusBreakdown[issue.status] += 1
    }

    return success({
      project,
      totalIssues: allIssues.length,
      statusBreakdown,
    })
  }

  private async fetchAllIssues(projectId: ProjectId): Promise<Issue[]> {
    const PAGE_SIZE = 100
    const allIssues: Issue[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const result = await this.issueRepository.list(
        { projectId },
        { page, limit: PAGE_SIZE },
      )
      allIssues.push(...result.items)
      hasMore = result.hasMore
      page++
    }

    return allIssues
  }
}
