import type { CreateEpicInput, Epic, UpdateEpicInput } from '../model/epic.js'
import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { EpicId } from '../model/value-objects.js'
import type { SortOptions } from './sort-options.js'

/**
 * Port interface for epic persistence and retrieval.
 *
 * Implementations of this interface provide access to epics
 * from a specific backend (GitHub, JIRA, local tracker, etc.).
 */
export interface IEpicRepository {
  /**
   * Creates a new epic.
   *
   * @param input - The epic data to create
   * @returns The created epic with generated ID and timestamps
   * @throws {ValidationError} When the input fails domain validation
   * @throws {ConflictError} When an epic with the same title already exists in the milestone
   */
  create: (input: CreateEpicInput) => Promise<Epic>

  /**
   * Retrieves an epic by its unique identifier.
   *
   * @param id - The epic's branded UUID
   * @returns The epic entity
   * @throws {NotFoundError} When no epic exists with the given ID
   */
  getById: (id: EpicId) => Promise<Epic>

  /**
   * Applies a partial update to an existing epic.
   *
   * @param id - The epic's branded UUID
   * @param input - The fields to update (all optional)
   * @returns The updated epic entity
   * @throws {NotFoundError} When no epic exists with the given ID
   * @throws {ValidationError} When the update data fails validation
   */
  update: (id: EpicId, input: UpdateEpicInput) => Promise<Epic>

  /**
   * Deletes an epic.
   *
   * @param id - The epic's branded UUID
   * @throws {NotFoundError} When no epic exists with the given ID
   * @throws {AuthorizationError} When the caller lacks permission to delete
   */
  delete: (id: EpicId) => Promise<void>

  /**
   * Lists all epics with pagination.
   *
   * @param pagination - Page number and page size
   * @param sort - Optional sort field and direction
   * @returns A paginated result containing epics
   */
  list: (pagination: PaginationParams, sort?: SortOptions) => Promise<PaginatedResult<Epic>>
}
