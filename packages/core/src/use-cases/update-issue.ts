import type { Issue } from '../model/issue.js'
import type { IssueId, UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IIssueRepository } from '../ports/issue-repository.js'
import type { Result } from './result.js'

import { NotFoundError, ValidationError } from '../errors/domain-errors.js'
import { UpdateIssueInputSchema } from '../model/issue.js'
import { failure, success } from './result.js'

export class UpdateIssueUseCase {
  private readonly issueRepository: IIssueRepository
  private readonly auditLogger: IAuditLogger

  constructor(issueRepository: IIssueRepository, auditLogger: IAuditLogger) {
    this.issueRepository = issueRepository
    this.auditLogger = auditLogger
  }

  async execute(id: IssueId, input: unknown, userId: UserId): Promise<Result<Issue, ValidationError | NotFoundError>> {
    const parsed = UpdateIssueInputSchema.safeParse(input)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]!
      return failure(new ValidationError(firstIssue.path.join('.'), firstIssue.message))
    }

    try {
      const issue = await this.issueRepository.update(id, parsed.data)

      await this.auditLogger.log('UpdateIssue', userId, {
        issueId: id,
        updatedFields: Object.keys(parsed.data),
      })

      return success(issue)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(error)
      }
      throw error
    }
  }
}
