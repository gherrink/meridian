import type { GitHubRepoConfig } from '../github-repo-config.js'
import type { GitHubIssueResponse } from '../mappers/issue-mapper.js'

/**
 * Minimal Octokit interface for strategies that call native GitHub REST endpoints
 * via `octokit.request()`. Shared by DependencyApiStrategy and SubIssueApiStrategy.
 */
export interface NativeApiOctokit {
  request: (route: string, params?: Record<string, unknown>) => Promise<{
    data: unknown
  }>
}

/**
 * Minimal Octokit interface for strategies that read/write issue bodies
 * via the typed `rest.issues` namespace. Used by CommentFallbackStrategy.
 */
export interface CommentOctokit {
  rest: {
    issues: {
      get: (params: { owner: string, repo: string, issue_number: number }) => Promise<{ data: GitHubIssueResponse }>
      update: (params: Record<string, unknown>) => Promise<{ data: GitHubIssueResponse }>
    }
  }
}

export interface ParsedNativeLink {
  type: string
  owner: string
  repo: string
  issueNumber: number
  /**
   * When true, the parsed link's issueNumber represents the *source* of the
   * relationship rather than the target. This occurs when the GitHub API returns
   * the inverse direction (e.g., `blocked_by` endpoint returns the blocker,
   * which is the source of a `blocks` relationship). The consumer must swap
   * source and target when constructing the domain IssueLink.
   */
  reversed?: boolean
}

export interface LinkPersistenceStrategy {
  createLink: (sourceNumber: number, targetNumber: number, config: GitHubRepoConfig) => Promise<void>
  deleteLink: (sourceNumber: number, targetNumber: number, config: GitHubRepoConfig) => Promise<void>
  findLinksByIssue: (issueNumber: number, config: GitHubRepoConfig) => Promise<ParsedNativeLink[]>
}
