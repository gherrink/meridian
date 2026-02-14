import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { CreateProjectInput, Project, UpdateProjectInput } from '../model/project.js'
import type { ProjectId } from '../model/value-objects.js'
import type { SortOptions } from './sort-options.js'

/**
 * Port interface for project persistence and retrieval.
 *
 * Implementations of this interface provide access to projects
 * from a specific backend (GitHub, JIRA, local tracker, etc.).
 */
export interface IProjectRepository {
  /**
   * Creates a new project.
   *
   * @param input - The project data to create
   * @returns The created project with generated ID and timestamps
   * @throws {ValidationError} When the input fails domain validation
   * @throws {ConflictError} When a project with the same name already exists
   */
  create: (input: CreateProjectInput) => Promise<Project>

  /**
   * Retrieves a project by its unique identifier.
   *
   * @param id - The project's branded UUID
   * @returns The project entity
   * @throws {NotFoundError} When no project exists with the given ID
   */
  getById: (id: ProjectId) => Promise<Project>

  /**
   * Applies a partial update to an existing project.
   *
   * @param id - The project's branded UUID
   * @param input - The fields to update (all optional)
   * @returns The updated project entity
   * @throws {NotFoundError} When no project exists with the given ID
   * @throws {ValidationError} When the update data fails validation
   */
  update: (id: ProjectId, input: UpdateProjectInput) => Promise<Project>

  /**
   * Deletes a project.
   *
   * @param id - The project's branded UUID
   * @throws {NotFoundError} When no project exists with the given ID
   * @throws {AuthorizationError} When the caller lacks permission to delete
   */
  delete: (id: ProjectId) => Promise<void>

  /**
   * Lists all projects with pagination.
   *
   * @param pagination - Page number and page size
   * @param sort - Optional sort field and direction
   * @returns A paginated result containing projects
   */
  list: (pagination: PaginationParams, sort?: SortOptions) => Promise<PaginatedResult<Project>>
}
