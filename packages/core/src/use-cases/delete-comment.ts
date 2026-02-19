import type { CommentId, UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { ICommentRepository } from '../ports/comment-repository.js'
import type { Result } from './result.js'

import { NotFoundError } from '../errors/domain-errors.js'
import { failure, success } from './result.js'

export class DeleteCommentUseCase {
  private readonly commentRepository: ICommentRepository
  private readonly auditLogger: IAuditLogger

  constructor(commentRepository: ICommentRepository, auditLogger: IAuditLogger) {
    this.commentRepository = commentRepository
    this.auditLogger = auditLogger
  }

  async execute(id: CommentId, userId: UserId): Promise<Result<void, NotFoundError>> {
    try {
      await this.commentRepository.delete(id)

      await this.auditLogger.log('DeleteComment', userId, {
        commentId: id,
      })

      return success(undefined)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(error)
      }
      throw error
    }
  }
}
