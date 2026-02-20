import type { IssueLink } from '../model/issue-link.js'
import type { RelationshipType } from '../model/relationship-type.js'
import type { IssueLinkId } from '../model/value-objects.js'
import type { IIssueLinkRepository } from '../ports/issue-link-repository.js'
import type { IIssueRepository } from '../ports/issue-repository.js'
import type { Result } from './result.js'

import { randomUUID } from 'node:crypto'

import { ConflictError, NotFoundError, ValidationError } from '../errors/domain-errors.js'
import { CreateIssueLinkInputSchema } from '../model/issue-link.js'
import { failure, success } from './result.js'

export class CreateIssueLinkUseCase {
  private readonly issueLinkRepository: IIssueLinkRepository
  private readonly issueRepository: IIssueRepository
  private readonly relationshipTypes: RelationshipType[]

  constructor(
    issueLinkRepository: IIssueLinkRepository,
    issueRepository: IIssueRepository,
    relationshipTypes: RelationshipType[],
  ) {
    this.issueLinkRepository = issueLinkRepository
    this.issueRepository = issueRepository
    this.relationshipTypes = relationshipTypes
  }

  async execute(input: unknown): Promise<Result<IssueLink, ValidationError | ConflictError | NotFoundError>> {
    const parsed = CreateIssueLinkInputSchema.safeParse(input)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]!
      return failure(new ValidationError(firstIssue.path.join('.'), firstIssue.message))
    }

    const { sourceIssueId, targetIssueId, type } = parsed.data

    const relationshipType = this.relationshipTypes.find(rt => rt.name === type)
    if (!relationshipType) {
      return failure(new ValidationError('type', `unknown relationship type '${type}'`))
    }

    if (sourceIssueId === targetIssueId) {
      return failure(new ValidationError('targetIssueId', 'cannot link issue to itself'))
    }

    try {
      await this.issueRepository.getById(sourceIssueId)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(new NotFoundError('Issue', sourceIssueId))
      }
      throw error
    }

    try {
      await this.issueRepository.getById(targetIssueId)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(new NotFoundError('Issue', targetIssueId))
      }
      throw error
    }

    let normalizedSourceId = sourceIssueId
    let normalizedTargetId = targetIssueId

    if (relationshipType.symmetric && sourceIssueId > targetIssueId) {
      normalizedSourceId = targetIssueId
      normalizedTargetId = sourceIssueId
    }

    const existingLink = await this.issueLinkRepository.findBySourceAndTargetAndType(
      normalizedSourceId,
      normalizedTargetId,
      type,
    )

    if (existingLink) {
      return failure(new ConflictError('IssueLink', normalizedSourceId, 'link already exists'))
    }

    const link: IssueLink = {
      id: randomUUID() as IssueLinkId,
      sourceIssueId: normalizedSourceId,
      targetIssueId: normalizedTargetId,
      type,
      createdAt: new Date(),
    }

    const createdLink = await this.issueLinkRepository.create(link)
    return success(createdLink)
  }
}
