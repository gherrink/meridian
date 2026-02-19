import type { Issue } from '../model/issue.js'
import type { State } from '../model/state.js'
import type { IssueId, UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IIssueRepository } from '../ports/issue-repository.js'
import type { Result } from './result.js'

import { NotFoundError, ValidationError } from '../errors/domain-errors.js'
import { StateSchema } from '../model/state.js'
import { failure, success } from './result.js'

export class UpdateStateUseCase {
  private readonly issueRepository: IIssueRepository
  private readonly auditLogger: IAuditLogger

  constructor(issueRepository: IIssueRepository, auditLogger: IAuditLogger) {
    this.issueRepository = issueRepository
    this.auditLogger = auditLogger
  }

  async execute(issueId: IssueId, state: State, userId: UserId): Promise<Result<Issue, NotFoundError | ValidationError>> {
    const parsed = StateSchema.safeParse(state)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]!
      return failure(new ValidationError('state', firstIssue.message))
    }

    try {
      const existingIssue = await this.issueRepository.getById(issueId)
      const oldState = existingIssue.state

      const updatedIssue = await this.issueRepository.update(issueId, { state: parsed.data })

      await this.auditLogger.log('UpdateState', userId, {
        issueId,
        oldState,
        newState: parsed.data,
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
