export { GitHubIssueRepository } from './github-issue-repository.js'
export type { GitHubRepoConfig } from './github-repo-config.js'
export { mapGitHubError } from './mappers/error-mapper.js'
export type { GitHubLabel } from './mappers/github-types.js'
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
