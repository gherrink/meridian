import type { GitHubRepoConfig } from '../github-repo-config.js'
import type { LinkPersistenceStrategy, NativeApiOctokit, ParsedNativeLink } from './link-persistence-strategy.js'

import { mapGitHubError } from '../mappers/error-mapper.js'

interface SubIssueResponse {
  number: number
  id: number
}

interface ParentIssueResponse {
  number: number
  id: number
}

type IssueIdResolver = (issueNumber: number, config: GitHubRepoConfig) => Promise<number>

export class SubIssueApiStrategy implements LinkPersistenceStrategy {
  private readonly octokit: NativeApiOctokit
  private readonly resolveIssueGlobalId: IssueIdResolver

  constructor(octokit: NativeApiOctokit, resolveIssueGlobalId: IssueIdResolver) {
    this.octokit = octokit
    this.resolveIssueGlobalId = resolveIssueGlobalId
  }

  createLink = async (sourceNumber: number, targetNumber: number, config: GitHubRepoConfig): Promise<void> => {
    const childGlobalId = await this.resolveIssueGlobalId(targetNumber, config)

    try {
      await this.octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
        owner: config.owner,
        repo: config.repo,
        issue_number: sourceNumber,
        sub_issue_id: childGlobalId,
      })
    }
    catch (error) {
      if (isDuplicateSubIssueError(error)) {
        return
      }
      throw mapGitHubError(error)
    }
  }

  deleteLink = async (sourceNumber: number, targetNumber: number, config: GitHubRepoConfig): Promise<void> => {
    const childGlobalId = await this.resolveIssueGlobalId(targetNumber, config)

    try {
      await this.octokit.request('DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue', {
        owner: config.owner,
        repo: config.repo,
        issue_number: sourceNumber,
        sub_issue_id: childGlobalId,
      })
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  findLinksByIssue = async (issueNumber: number, config: GitHubRepoConfig): Promise<ParsedNativeLink[]> => {
    const links: ParsedNativeLink[] = []

    const children = await this.fetchSubIssues(issueNumber, config)
    for (const child of children) {
      links.push({
        type: 'parent',
        owner: config.owner,
        repo: config.repo,
        issueNumber: child.number,
      })
    }

    const parent = await this.fetchParentIssue(issueNumber, config)
    if (parent !== null) {
      links.push({
        type: 'parent',
        owner: config.owner,
        repo: config.repo,
        issueNumber: parent.number,
        reversed: true,
      })
    }

    return links
  }

  private async fetchSubIssues(issueNumber: number, config: GitHubRepoConfig): Promise<SubIssueResponse[]> {
    try {
      const response = await this.octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
        owner: config.owner,
        repo: config.repo,
        issue_number: issueNumber,
      })
      return Array.isArray(response.data) ? response.data as SubIssueResponse[] : []
    }
    catch (error) {
      if (isFeatureNotEnabledError(error)) {
        return []
      }
      throw mapGitHubError(error)
    }
  }

  private async fetchParentIssue(issueNumber: number, config: GitHubRepoConfig): Promise<ParentIssueResponse | null> {
    try {
      const response = await this.octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/parent', {
        owner: config.owner,
        repo: config.repo,
        issue_number: issueNumber,
      })
      if (response.data !== null && typeof response.data === 'object' && 'number' in (response.data as object)) {
        return response.data as ParentIssueResponse
      }
      return null
    }
    catch (error) {
      if (isFeatureNotEnabledError(error)) {
        return null
      }
      throw mapGitHubError(error)
    }
  }
}

function isDuplicateSubIssueError(error: unknown): boolean {
  const httpError = error as { response?: { status?: number } }
  return httpError.response?.status === 422
}

function isFeatureNotEnabledError(error: unknown): boolean {
  const httpError = error as { response?: { status?: number } }
  return httpError.response?.status === 404
}
