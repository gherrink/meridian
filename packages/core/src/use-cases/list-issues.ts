import type { Issue } from '../model/issue.js'
import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { IssueFilterParams } from '../ports/issue-filter-params.js'
import type { IIssueRepository } from '../ports/issue-repository.js'
import type { SortOptions } from '../ports/sort-options.js'
import type { Result } from './result.js'

import { success } from './result.js'

export class ListIssuesUseCase {
  private readonly issueRepository: IIssueRepository

  constructor(issueRepository: IIssueRepository) {
    this.issueRepository = issueRepository
  }

  async execute(
    filter: IssueFilterParams,
    pagination: PaginationParams,
    sort?: SortOptions,
  ): Promise<Result<PaginatedResult<Issue>>> {
    const result = await this.issueRepository.list(filter, pagination, sort)
    return success(result)
  }
}
