import type { CreateIssueInput, Issue, UpdateIssueInput } from '../model/issue.js'
import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { IssueId } from '../model/value-objects.js'
import type { IssueFilterParams } from './issue-filter-params.js'
import type { SortOptions } from './sort-options.js'

/**
 * Port interface for issue persistence and retrieval.
 *
 * Implementations of this interface provide access to issues
 * from a specific backend (GitHub, JIRA, local tracker, etc.).
 * All methods are async to support network-based adapters.
 */
export interface IIssueRepository {
  /**
   * Creates a new issue.
   *
   * @param input - The issue data to create
   * @returns The created issue with generated ID and timestamps
   * @throws {ValidationError} When the input fails domain validation
   * @throws {ConflictError} When a conflict prevents creation
   */
  create: (input: CreateIssueInput) => Promise<Issue>

  /**
   * Retrieves an issue by its unique identifier.
   *
   * @param id - The issue's branded UUID
   * @returns The issue entity
   * @throws {NotFoundError} When no issue exists with the given ID
   */
  getById: (id: IssueId) => Promise<Issue>

  /**
   * Applies a partial update to an existing issue.
   *
   * @param id - The issue's branded UUID
   * @param input - The fields to update (all optional)
   * @returns The updated issue entity
   * @throws {NotFoundError} When no issue exists with the given ID
   * @throws {ValidationError} When the update data fails validation
   * @throws {ConflictError} When a concurrent modification conflict occurs
   */
  update: (id: IssueId, input: UpdateIssueInput) => Promise<Issue>

  /**
   * Deletes an issue.
   *
   * @param id - The issue's branded UUID
   * @throws {NotFoundError} When no issue exists with the given ID
   * @throws {AuthorizationError} When the caller lacks permission to delete
   */
  delete: (id: IssueId) => Promise<void>

  /**
   * Lists issues matching the given filter criteria.
   *
   * Returns an empty result set (not an error) when no issues match.
   *
   * @param filter - Filter criteria (all optional, combined with AND logic)
   * @param pagination - Page number and page size
   * @param sort - Optional sort field and direction
   * @returns A paginated result containing matching issues
   */
  list: (filter: IssueFilterParams, pagination: PaginationParams, sort?: SortOptions) => Promise<PaginatedResult<Issue>>
}
