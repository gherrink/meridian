import type { Issue } from '../model/issue.js'
import type { IssueId, UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IIssueRepository } from '../ports/issue-repository.js'
import type { IUserRepository } from '../ports/user-repository.js'
import type { Result } from './result.js'

import { NotFoundError } from '../errors/domain-errors.js'
import { failure, success } from './result.js'

export class AssignIssueUseCase {
  private readonly issueRepository: IIssueRepository
  private readonly userRepository: IUserRepository
  private readonly auditLogger: IAuditLogger

  constructor(
    issueRepository: IIssueRepository,
    userRepository: IUserRepository,
    auditLogger: IAuditLogger,
  ) {
    this.issueRepository = issueRepository
    this.userRepository = userRepository
    this.auditLogger = auditLogger
  }

  async execute(issueId: IssueId, assigneeId: UserId, userId: UserId): Promise<Result<Issue, NotFoundError>> {
    try {
      await this.userRepository.getById(assigneeId)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(new NotFoundError('User', assigneeId))
      }
      throw error
    }

    try {
      const issue = await this.issueRepository.getById(issueId)

      const assigneeIds = issue.assigneeIds.includes(assigneeId)
        ? issue.assigneeIds
        : [...issue.assigneeIds, assigneeId]

      const updatedIssue = await this.issueRepository.update(issueId, { assigneeIds })

      await this.auditLogger.log('AssignIssue', userId, {
        issueId,
        assigneeId,
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
