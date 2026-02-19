import type { Comment } from '../model/comment.js'
import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { IssueId } from '../model/value-objects.js'
import type { ICommentRepository } from '../ports/comment-repository.js'
import type { SortOptions } from '../ports/sort-options.js'
import type { Result } from './result.js'

import { success } from './result.js'

export class GetCommentsByIssueUseCase {
  private readonly commentRepository: ICommentRepository

  constructor(commentRepository: ICommentRepository) {
    this.commentRepository = commentRepository
  }

  async execute(
    issueId: IssueId,
    pagination: PaginationParams,
    sort?: SortOptions,
  ): Promise<Result<PaginatedResult<Comment>>> {
    const result = await this.commentRepository.getByIssueId(issueId, pagination, sort)
    return success(result)
  }
}
