export { GitHubIssueRepository } from './github-issue-repository.js'
export type { GitHubRepoConfig } from './github-repo-config.js'
export {
  toCreateParams as commentToCreateParams,
  toDomain as commentToDomain,
  toUpdateParams as commentToUpdateParams,
} from './mappers/comment-mapper.js'
export type {
  OctokitCommentCreateParams,
  OctokitCommentUpdateParams,
} from './mappers/comment-mapper.js'
export {
  COMMENT_ID_NAMESPACE,
  generateDeterministicId,
  ISSUE_ID_NAMESPACE,
  PROJECT_ID_NAMESPACE,
  USER_ID_NAMESPACE,
} from './mappers/deterministic-id.js'
export { mapGitHubError } from './mappers/error-mapper.js'
export type {
  GitHubCommentResponse,
  GitHubLabel,
  GitHubMilestoneResponse,
  GitHubUserResponse,
} from './mappers/github-types.js'
export { normalizeLabels } from './mappers/github-types.js'
export {
  extractIssueNumber,
  toCreateParams,
  toDomain,
  toUpdateParams,
} from './mappers/issue-mapper.js'
export type { GitHubIssueResponse } from './mappers/issue-mapper.js'
export {
  extractPriority,
  extractStatus,
  extractTags,
  toPriorityLabel,
  toStatusLabels,
} from './mappers/label-mapper.js'
export {
  toCreateParams as projectToCreateParams,
  toDomain as projectToDomain,
  toUpdateParams as projectToUpdateParams,
} from './mappers/project-mapper.js'
export type {
  OctokitMilestoneCreateParams,
  OctokitMilestoneUpdateParams,
} from './mappers/project-mapper.js'
export {
  generateUserIdFromLogin,
  toDomainFromDeletedUser,
  toDomain as userToDomain,
} from './mappers/user-mapper.js'
