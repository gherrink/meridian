import type { CreateMilestoneInput, Milestone, UpdateMilestoneInput } from '../model/milestone.js'
import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { MilestoneId } from '../model/value-objects.js'
import type { SortOptions } from './sort-options.js'

/**
 * Port interface for milestone persistence and retrieval.
 *
 * Implementations of this interface provide access to milestones
 * from a specific backend (GitHub, JIRA, local tracker, etc.).
 */
export interface IMilestoneRepository {
  /**
   * Creates a new milestone.
   *
   * @param input - The milestone data to create
   * @returns The created milestone with generated ID and timestamps
   * @throws {ValidationError} When the input fails domain validation
   * @throws {ConflictError} When a milestone with the same name already exists
   */
  create: (input: CreateMilestoneInput) => Promise<Milestone>

  /**
   * Retrieves a milestone by its unique identifier.
   *
   * @param id - The milestone's branded UUID
   * @returns The milestone entity
   * @throws {NotFoundError} When no milestone exists with the given ID
   */
  getById: (id: MilestoneId) => Promise<Milestone>

  /**
   * Applies a partial update to an existing milestone.
   *
   * @param id - The milestone's branded UUID
   * @param input - The fields to update (all optional)
   * @returns The updated milestone entity
   * @throws {NotFoundError} When no milestone exists with the given ID
   * @throws {ValidationError} When the update data fails validation
   */
  update: (id: MilestoneId, input: UpdateMilestoneInput) => Promise<Milestone>

  /**
   * Deletes a milestone.
   *
   * @param id - The milestone's branded UUID
   * @throws {NotFoundError} When no milestone exists with the given ID
   * @throws {AuthorizationError} When the caller lacks permission to delete
   */
  delete: (id: MilestoneId) => Promise<void>

  /**
   * Lists all milestones with pagination.
   *
   * @param pagination - Page number and page size
   * @param sort - Optional sort field and direction
   * @returns A paginated result containing milestones
   */
  list: (pagination: PaginationParams, sort?: SortOptions) => Promise<PaginatedResult<Milestone>>
}
