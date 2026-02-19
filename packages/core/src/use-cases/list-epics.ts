import type { Epic } from '../model/epic.js'
import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { IEpicRepository } from '../ports/epic-repository.js'
import type { SortOptions } from '../ports/sort-options.js'
import type { Result } from './result.js'

import { success } from './result.js'

export class ListEpicsUseCase {
  private readonly epicRepository: IEpicRepository

  constructor(epicRepository: IEpicRepository) {
    this.epicRepository = epicRepository
  }

  async execute(
    pagination: PaginationParams,
    sort?: SortOptions,
  ): Promise<Result<PaginatedResult<Epic>>> {
    const result = await this.epicRepository.list(pagination, sort)
    return success(result)
  }
}
