import type { IssueLink } from '../model/issue-link.js'
import type { IssueId, IssueLinkId } from '../model/value-objects.js'

/**
 * Port interface for issue link persistence and retrieval.
 *
 * Implementations of this interface provide access to issue links
 * from a specific backend (in-memory, GitHub body comments, etc.).
 * All methods are async to support network-based adapters.
 */
export interface IIssueLinkRepository {
  /**
   * Creates a new issue link.
   *
   * @param link - The complete issue link entity to persist
   * @returns The persisted issue link
   */
  create: (link: IssueLink) => Promise<IssueLink>

  /**
   * Deletes an issue link by its unique identifier.
   *
   * @param id - The issue link's branded UUID
   * @throws {NotFoundError} When no link exists with the given ID
   */
  delete: (id: IssueLinkId) => Promise<void>

  /**
   * Retrieves an issue link by its unique identifier.
   *
   * @param id - The issue link's branded UUID
   * @returns The issue link entity, or null if not found
   */
  findById: (id: IssueLinkId) => Promise<IssueLink | null>

  /**
   * Finds all issue links involving a given issue as source or target.
   *
   * @param issueId - The issue's branded UUID
   * @param filter - Optional filter to narrow results by relationship type
   * @returns Array of matching issue links
   */
  findByIssueId: (issueId: IssueId, filter?: { type?: string }) => Promise<IssueLink[]>

  /**
   * Finds a specific link between two issues of a given type.
   * Used for duplicate detection.
   *
   * @param sourceIssueId - The source issue's branded UUID
   * @param targetIssueId - The target issue's branded UUID
   * @param type - The relationship type name
   * @returns The matching issue link, or null if not found
   */
  findBySourceAndTargetAndType: (
    sourceIssueId: IssueId,
    targetIssueId: IssueId,
    type: string,
  ) => Promise<IssueLink | null>

  /**
   * Deletes all issue links involving a given issue.
   * Used for cascade cleanup when an issue is deleted.
   *
   * @param issueId - The issue's branded UUID
   */
  deleteByIssueId: (issueId: IssueId) => Promise<void>
}
