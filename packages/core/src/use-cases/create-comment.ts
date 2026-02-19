import type { Comment } from '../model/comment.js'
import type { UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { ICommentRepository } from '../ports/comment-repository.js'
import type { Result } from './result.js'

import { DomainError, ValidationError } from '../errors/domain-errors.js'
import { CreateCommentInputSchema } from '../model/comment.js'
import { failure, success } from './result.js'

export class CreateCommentUseCase {
  private readonly commentRepository: ICommentRepository
  private readonly auditLogger: IAuditLogger

  constructor(commentRepository: ICommentRepository, auditLogger: IAuditLogger) {
    this.commentRepository = commentRepository
    this.auditLogger = auditLogger
  }

  async execute(input: unknown, userId: UserId): Promise<Result<Comment, DomainError>> {
    const parsed = CreateCommentInputSchema.safeParse(input)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]!
      return failure(new ValidationError(firstIssue.path.join('.'), firstIssue.message))
    }

    try {
      const comment = await this.commentRepository.create(parsed.data)

      await this.auditLogger.log('CreateComment', userId, {
        commentId: comment.id,
        issueId: comment.issueId,
      })

      return success(comment)
    }
    catch (error) {
      if (error instanceof DomainError) {
        return failure(error)
      }
      throw error
    }
  }
}
