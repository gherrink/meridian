import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { User } from '../model/user.js'
import type { UserId } from '../model/value-objects.js'

/**
 * Port interface for user lookup and search.
 *
 * Users are typically managed externally (e.g., GitHub accounts,
 * JIRA users). This interface provides read-only access to user data.
 */
export interface IUserRepository {
  /**
   * Retrieves a user by their unique identifier.
   *
   * @param id - The user's branded UUID
   * @returns The user entity
   * @throws {NotFoundError} When no user exists with the given ID
   */
  getById: (id: UserId) => Promise<User>

  /**
   * Retrieves the currently authenticated user.
   *
   * The meaning of "current user" is adapter-specific:
   * - GitHub: the user associated with the API token
   * - Local tracker: the configured local user
   *
   * @returns The current user entity
   * @throws {AuthorizationError} When no user is authenticated
   */
  getCurrent: () => Promise<User>

  /**
   * Searches for users by name or email.
   *
   * Returns an empty result set (not an error) when no users match.
   *
   * @param query - Search string matched against user name and email
   * @param pagination - Page number and page size
   * @returns A paginated result containing matching users
   */
  search: (query: string, pagination: PaginationParams) => Promise<PaginatedResult<User>>
}
