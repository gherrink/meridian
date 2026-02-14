import type { Issue } from '../model/issue.js'
import type { IssueId, UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IIssueRepository } from '../ports/issue-repository.js'
import type { Result } from './result.js'

import { NotFoundError, ValidationError } from '../errors/domain-errors.js'
import { StatusSchema } from '../model/status.js'
import { failure, success } from './result.js'

export class UpdateStatusUseCase {
  private readonly issueRepository: IIssueRepository
  private readonly auditLogger: IAuditLogger

  constructor(issueRepository: IIssueRepository, auditLogger: IAuditLogger) {
    this.issueRepository = issueRepository
    this.auditLogger = auditLogger
  }

  async execute(issueId: IssueId, status: unknown, userId: UserId): Promise<Result<Issue, NotFoundError | ValidationError>> {
    const parsed = StatusSchema.safeParse(status)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]!
      return failure(new ValidationError('status', firstIssue.message))
    }

    try {
      const existingIssue = await this.issueRepository.getById(issueId)
      const oldStatus = existingIssue.status

      const updatedIssue = await this.issueRepository.update(issueId, { status: parsed.data })

      await this.auditLogger.log('UpdateStatus', userId, {
        issueId,
        oldStatus,
        newStatus: parsed.data,
      })

      return success(updatedIssue)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(error)
      }
      throw error
    }
  }
}
