import type { IssueLink } from '../model/issue-link.js'
import type { IssueId, IssueLinkId } from '../model/value-objects.js'
import type { IIssueLinkRepository } from '../ports/issue-link-repository.js'

import { NotFoundError } from '../errors/domain-errors.js'

export class InMemoryIssueLinkRepository implements IIssueLinkRepository {
  private readonly store = new Map<IssueLinkId, IssueLink>()

  create = async (link: IssueLink): Promise<IssueLink> => {
    this.store.set(link.id, link)
    return link
  }

  delete = async (id: IssueLinkId): Promise<void> => {
    if (!this.store.has(id)) {
      throw new NotFoundError('IssueLink', id)
    }
    this.store.delete(id)
  }

  findById = async (id: IssueLinkId): Promise<IssueLink | null> => {
    return this.store.get(id) ?? null
  }

  findByIssueId = async (issueId: IssueId, filter?: { type?: string }): Promise<IssueLink[]> => {
    const allLinks = Array.from(this.store.values())
    return allLinks.filter((link) => {
      const involvesIssue = link.sourceIssueId === issueId || link.targetIssueId === issueId
      if (!involvesIssue) {
        return false
      }
      if (filter?.type !== undefined && link.type !== filter.type) {
        return false
      }
      return true
    })
  }

  findBySourceAndTargetAndType = async (
    sourceIssueId: IssueId,
    targetIssueId: IssueId,
    type: string,
  ): Promise<IssueLink | null> => {
    const allLinks = Array.from(this.store.values())
    return allLinks.find(
      link => link.sourceIssueId === sourceIssueId
        && link.targetIssueId === targetIssueId
        && link.type === type,
    ) ?? null
  }

  deleteByIssueId = async (issueId: IssueId): Promise<void> => {
    const idsToDelete: IssueLinkId[] = []
    for (const [id, link] of this.store) {
      if (link.sourceIssueId === issueId || link.targetIssueId === issueId) {
        idsToDelete.push(id)
      }
    }
    for (const id of idsToDelete) {
      this.store.delete(id)
    }
  }

  seed(links: IssueLink[]): void {
    for (const link of links) {
      this.store.set(link.id, link)
    }
  }

  reset(): void {
    this.store.clear()
  }
}
