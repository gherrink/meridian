import type { Milestone } from '../model/milestone.js'
import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { IMilestoneRepository } from '../ports/milestone-repository.js'
import type { SortOptions } from '../ports/sort-options.js'
import type { Result } from './result.js'

import { success } from './result.js'

export class ListMilestonesUseCase {
  private readonly milestoneRepository: IMilestoneRepository

  constructor(milestoneRepository: IMilestoneRepository) {
    this.milestoneRepository = milestoneRepository
  }

  async execute(
    pagination: PaginationParams,
    sort?: SortOptions,
  ): Promise<Result<PaginatedResult<Milestone>>> {
    const result = await this.milestoneRepository.list(pagination, sort)
    return success(result)
  }
}
