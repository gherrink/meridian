import type { Comment } from '../model/comment.js'
import type { CommentId, UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { ICommentRepository } from '../ports/comment-repository.js'
import type { Result } from './result.js'

import { NotFoundError, ValidationError } from '../errors/domain-errors.js'
import { UpdateCommentInputSchema } from '../model/comment.js'
import { failure, success } from './result.js'

export class UpdateCommentUseCase {
  private readonly commentRepository: ICommentRepository
  private readonly auditLogger: IAuditLogger

  constructor(commentRepository: ICommentRepository, auditLogger: IAuditLogger) {
    this.commentRepository = commentRepository
    this.auditLogger = auditLogger
  }

  async execute(id: CommentId, input: unknown, userId: UserId): Promise<Result<Comment, ValidationError | NotFoundError>> {
    const parsed = UpdateCommentInputSchema.safeParse(input)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]!
      return failure(new ValidationError(firstIssue.path.join('.'), firstIssue.message))
    }

    try {
      const comment = await this.commentRepository.update(id, parsed.data)

      await this.auditLogger.log('UpdateComment', userId, {
        commentId: id,
        updatedFields: Object.keys(parsed.data),
      })

      return success(comment)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(error)
      }
      throw error
    }
  }
}
