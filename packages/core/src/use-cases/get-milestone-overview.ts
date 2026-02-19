import type { Issue } from '../model/issue.js'
import type { Milestone } from '../model/milestone.js'
import type { State } from '../model/state.js'
import type { MilestoneId } from '../model/value-objects.js'
import type { IIssueRepository } from '../ports/issue-repository.js'
import type { IMilestoneRepository } from '../ports/milestone-repository.js'
import type { Result } from './result.js'

import { NotFoundError } from '../errors/domain-errors.js'
import { STATE_VALUES } from '../model/state.js'
import { failure, success } from './result.js'

export interface MilestoneOverview {
  milestone: Milestone
  totalIssues: number
  stateBreakdown: Record<State, number>
}

export class GetMilestoneOverviewUseCase {
  private readonly milestoneRepository: IMilestoneRepository
  private readonly issueRepository: IIssueRepository

  constructor(milestoneRepository: IMilestoneRepository, issueRepository: IIssueRepository) {
    this.milestoneRepository = milestoneRepository
    this.issueRepository = issueRepository
  }

  async execute(milestoneId: MilestoneId): Promise<Result<MilestoneOverview, NotFoundError>> {
    let milestone: Milestone

    try {
      milestone = await this.milestoneRepository.getById(milestoneId)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(error)
      }
      throw error
    }

    const allIssues = await this.fetchAllIssues(milestoneId)

    const stateBreakdown = Object.fromEntries(
      STATE_VALUES.map(s => [s, 0]),
    ) as Record<State, number>

    for (const issue of allIssues) {
      stateBreakdown[issue.state] += 1
    }

    return success({
      milestone,
      totalIssues: allIssues.length,
      stateBreakdown,
    })
  }

  private async fetchAllIssues(milestoneId: MilestoneId): Promise<Issue[]> {
    const PAGE_SIZE = 100
    const allIssues: Issue[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const result = await this.issueRepository.list(
        { milestoneId },
        { page, limit: PAGE_SIZE },
      )
      allIssues.push(...result.items)
      hasMore = result.hasMore
      page++
    }

    return allIssues
  }
}
