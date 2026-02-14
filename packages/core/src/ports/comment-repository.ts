import type { Comment, CreateCommentInput, UpdateCommentInput } from '../model/comment.js'
import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { CommentId, IssueId } from '../model/value-objects.js'
import type { SortOptions } from './sort-options.js'

/**
 * Port interface for comment persistence and retrieval.
 *
 * Comments are always associated with an issue. This interface
 * provides methods to manage comments within that context.
 */
export interface ICommentRepository {
  /**
   * Creates a new comment on an issue.
   *
   * @param input - The comment data including issueId and authorId
   * @returns The created comment with generated ID and timestamps
   * @throws {ValidationError} When the input fails domain validation
   */
  create: (input: CreateCommentInput) => Promise<Comment>

  /**
   * Retrieves all comments for a given issue.
   *
   * Returns an empty result set (not an error) when the issue has no comments.
   *
   * @param issueId - The branded UUID of the parent issue
   * @param pagination - Page number and page size
   * @param sort - Optional sort field and direction
   * @returns A paginated result containing comments for the issue
   */
  getByIssueId: (issueId: IssueId, pagination: PaginationParams, sort?: SortOptions) => Promise<PaginatedResult<Comment>>

  /**
   * Updates a comment's content.
   *
   * @param id - The comment's branded UUID
   * @param input - The fields to update
   * @returns The updated comment entity
   * @throws {NotFoundError} When no comment exists with the given ID
   * @throws {AuthorizationError} When the caller is not the comment author
   */
  update: (id: CommentId, input: UpdateCommentInput) => Promise<Comment>

  /**
   * Deletes a comment.
   *
   * @param id - The comment's branded UUID
   * @throws {NotFoundError} When no comment exists with the given ID
   * @throws {AuthorizationError} When the caller lacks permission to delete
   */
  delete: (id: CommentId) => Promise<void>
}
