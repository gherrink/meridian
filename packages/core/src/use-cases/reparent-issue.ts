import type { Issue } from '../model/issue.js'
import type { IssueId, UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IIssueRepository } from '../ports/issue-repository.js'
import type { Result } from './result.js'

import { NotFoundError, ValidationError } from '../errors/domain-errors.js'
import { failure, success } from './result.js'

const MAX_NESTING_DEPTH = 3

export class ReparentIssueUseCase {
  private readonly issueRepository: IIssueRepository
  private readonly auditLogger: IAuditLogger

  constructor(issueRepository: IIssueRepository, auditLogger: IAuditLogger) {
    this.issueRepository = issueRepository
    this.auditLogger = auditLogger
  }

  async execute(issueId: IssueId, parentId: IssueId | null, userId: UserId): Promise<Result<Issue, NotFoundError | ValidationError>> {
    if (parentId === null) {
      return this.clearParent(issueId, userId)
    }

    if (issueId === parentId) {
      return failure(new ValidationError('parentId', 'An issue cannot be its own parent'))
    }

    try {
      await this.issueRepository.getById(issueId)
      await this.issueRepository.getById(parentId)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(error)
      }
      throw error
    }

    const circularCheck = await this.wouldCreateCycle(issueId, parentId)
    if (circularCheck) {
      return failure(new ValidationError('parentId', 'Circular reference detected'))
    }

    const depthFromRoot = await this.computeAncestorDepth(parentId)
    const subtreeDepth = await this.computeSubtreeDepth(issueId)

    if (depthFromRoot + 1 + subtreeDepth > MAX_NESTING_DEPTH) {
      return failure(new ValidationError('parentId', 'Maximum nesting depth of 3 exceeded'))
    }

    try {
      const updatedIssue = await this.issueRepository.update(issueId, { parentId })

      await this.auditLogger.log('ReparentIssue', userId, {
        issueId,
        parentId,
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

  private async clearParent(issueId: IssueId, userId: UserId): Promise<Result<Issue, NotFoundError | ValidationError>> {
    try {
      const updatedIssue = await this.issueRepository.update(issueId, { parentId: null })

      await this.auditLogger.log('ReparentIssue', userId, {
        issueId,
        parentId: null,
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

  private async wouldCreateCycle(issueId: IssueId, parentId: IssueId): Promise<boolean> {
    const allChildren = await this.collectDescendantIds(issueId)
    return allChildren.has(parentId)
  }

  private async collectDescendantIds(issueId: IssueId): Promise<Set<IssueId>> {
    const descendants = new Set<IssueId>()
    const queue: IssueId[] = [issueId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      const children = await this.issueRepository.list(
        { parentId: currentId },
        { page: 1, limit: 100 },
      )
      for (const child of children.items) {
        if (!descendants.has(child.id)) {
          descendants.add(child.id)
          queue.push(child.id)
        }
      }
    }

    return descendants
  }

  private async computeAncestorDepth(issueId: IssueId): Promise<number> {
    let depth = 0
    let currentId: IssueId | null = issueId

    while (currentId !== null) {
      depth++
      const issue = await this.issueRepository.getById(currentId)
      currentId = issue.parentId
    }

    return depth
  }

  private async computeSubtreeDepth(issueId: IssueId): Promise<number> {
    const children = await this.issueRepository.list(
      { parentId: issueId },
      { page: 1, limit: 100 },
    )

    if (children.items.length === 0) {
      return 0
    }

    let maxChildDepth = 0
    for (const child of children.items) {
      const childDepth = await this.computeSubtreeDepth(child.id)
      if (childDepth > maxChildDepth) {
        maxChildDepth = childDepth
      }
    }

    return 1 + maxChildDepth
  }
}
