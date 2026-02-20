import type { ResolvedIssueLink } from '../model/issue-link.js'
import type { RelationshipType } from '../model/relationship-type.js'
import type { IssueId } from '../model/value-objects.js'
import type { IIssueLinkRepository } from '../ports/issue-link-repository.js'
import type { Result } from './result.js'

import { success } from './result.js'

export class ListIssueLinksUseCase {
  private readonly issueLinkRepository: IIssueLinkRepository
  private readonly relationshipTypes: RelationshipType[]

  constructor(
    issueLinkRepository: IIssueLinkRepository,
    relationshipTypes: RelationshipType[],
  ) {
    this.issueLinkRepository = issueLinkRepository
    this.relationshipTypes = relationshipTypes
  }

  async execute(issueId: IssueId, filter?: { type?: string }): Promise<Result<ResolvedIssueLink[], never>> {
    const links = await this.issueLinkRepository.findByIssueId(issueId, filter)

    const resolvedLinks: ResolvedIssueLink[] = links.map((link) => {
      const relationshipType = this.relationshipTypes.find(rt => rt.name === link.type)
      const isSource = link.sourceIssueId === issueId

      const label = isSource
        ? (relationshipType?.forwardLabel ?? link.type)
        : (relationshipType?.inverseLabel ?? link.type)

      const linkedIssueId = isSource ? link.targetIssueId : link.sourceIssueId
      const direction = isSource ? 'outgoing' as const : 'incoming' as const

      return {
        id: link.id,
        linkedIssueId,
        type: link.type,
        label,
        direction,
        createdAt: link.createdAt,
      }
    })

    return success(resolvedLinks)
  }
}
