import type { IssueId, UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IIssueRepository } from '../ports/issue-repository.js'
import type { Result } from './result.js'

import { NotFoundError } from '../errors/domain-errors.js'
import { failure, success } from './result.js'

export class DeleteIssueUseCase {
  private readonly issueRepository: IIssueRepository
  private readonly auditLogger: IAuditLogger

  constructor(issueRepository: IIssueRepository, auditLogger: IAuditLogger) {
    this.issueRepository = issueRepository
    this.auditLogger = auditLogger
  }

  async execute(id: IssueId, userId: UserId): Promise<Result<void, NotFoundError>> {
    try {
      await this.issueRepository.delete(id)

      await this.auditLogger.log('DeleteIssue', userId, {
        issueId: id,
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
