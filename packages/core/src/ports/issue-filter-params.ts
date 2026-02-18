import type { Priority } from '../model/priority.js'
import type { Status } from '../model/status.js'
import type { MilestoneId, UserId } from '../model/value-objects.js'

/**
 * Filter parameters for querying issues.
 *
 * All fields are optional. When multiple fields are provided,
 * they are combined with AND logic (all conditions must match).
 * Pagination is handled separately via `PaginationParams`.
 */
export interface IssueFilterParams {
  /** Filter by milestone. */
  milestoneId?: MilestoneId
  /** Filter by status. */
  status?: Status
  /** Filter by priority level. */
  priority?: Priority
  /** Filter by assigned user. */
  assigneeId?: UserId
  /** Full-text search across issue title and description. */
  search?: string
}
