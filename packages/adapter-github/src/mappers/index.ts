export {
  toCreateParams as commentToCreateParams,
  toDomain as commentToDomain,
  toUpdateParams as commentToUpdateParams,
} from './comment-mapper.js'
export type {
  OctokitCommentCreateParams,
  OctokitCommentUpdateParams,
} from './comment-mapper.js'

export {
  COMMENT_ID_NAMESPACE,
  generateDeterministicId,
  ISSUE_ID_NAMESPACE,
  PROJECT_ID_NAMESPACE,
  USER_ID_NAMESPACE,
} from './deterministic-id.js'

export { mapGitHubError } from './error-mapper.js'

export type {
  GitHubCommentResponse,
  GitHubLabel,
  GitHubMilestoneResponse,
  GitHubUserResponse,
} from './github-types.js'
export { normalizeLabels } from './github-types.js'

export {
  extractIssueNumber,
  toCreateParams,
  toDomain,
  toUpdateParams,
} from './issue-mapper.js'
export type { GitHubIssueResponse } from './issue-mapper.js'

export {
  extractPriority,
  extractStatus,
  extractTags,
  toPriorityLabel,
  toStatusLabels,
} from './label-mapper.js'

export { parseTotalFromLinkHeader } from './pagination-utils.js'

export {
  toCreateParams as projectToCreateParams,
  toDomain as projectToDomain,
  toUpdateParams as projectToUpdateParams,
} from './project-mapper.js'
export type {
  OctokitMilestoneCreateParams,
  OctokitMilestoneUpdateParams,
} from './project-mapper.js'

export {
  generateUserIdFromLogin,
  toDomainFromDeletedUser,
  toDomain as userToDomain,
} from './user-mapper.js'
