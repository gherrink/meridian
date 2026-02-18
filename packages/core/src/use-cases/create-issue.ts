import type { Issue } from '../model/issue.js'
import type { UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IIssueRepository } from '../ports/issue-repository.js'
import type { Result } from './result.js'

import { ConflictError, ValidationError } from '../errors/domain-errors.js'
import { CreateIssueInputSchema } from '../model/issue.js'
import { failure, success } from './result.js'

export class CreateIssueUseCase {
  private readonly issueRepository: IIssueRepository
  private readonly auditLogger: IAuditLogger

  constructor(issueRepository: IIssueRepository, auditLogger: IAuditLogger) {
    this.issueRepository = issueRepository
    this.auditLogger = auditLogger
  }

  async execute(input: unknown, userId: UserId): Promise<Result<Issue, ValidationError | ConflictError>> {
    const parsed = CreateIssueInputSchema.safeParse(input)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]!
      return failure(new ValidationError(firstIssue.path.join('.'), firstIssue.message))
    }

    try {
      const issue = await this.issueRepository.create(parsed.data)

      await this.auditLogger.log('CreateIssue', userId, {
        issueId: issue.id,
        milestoneId: issue.milestoneId,
      })

      return success(issue)
    }
    catch (error) {
      if (error instanceof ConflictError) {
        return failure(error)
      }
      throw error
    }
  }
}
