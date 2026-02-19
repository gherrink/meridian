import type { Priority } from '../model/priority.js'
import type { State } from '../model/state.js'
import type { IssueId, MilestoneId, UserId } from '../model/value-objects.js'

/**
 * Filter parameters for querying issues.
 *
 * All fields are optional. When multiple fields are provided,
 * they are combined with AND logic (all conditions must match).
 * Pagination is handled separately via `PaginationParams`.
 */
export interface IssueFilterParams {
  /** Filter by milestone. Pass null to find issues without a milestone. */
  milestoneId?: MilestoneId | null
  /** Filter by state (open, in_progress, done). */
  state?: State
  /** Filter by workflow status (configurable string). */
  status?: string
  /** Filter by priority level. */
  priority?: Priority
  /** Filter by parent issue for hierarchy. Pass null to find root issues. */
  parentId?: IssueId | null
  /** Filter by assigned user. */
  assigneeId?: UserId
  /** Full-text search across issue title and description. */
  search?: string
}
