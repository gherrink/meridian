import type { GitHubRepoConfig } from '../github-repo-config.js'
import type { LinkPersistenceStrategy, NativeApiOctokit, ParsedNativeLink } from './link-persistence-strategy.js'

import { mapGitHubError } from '../mappers/error-mapper.js'

interface DependencyIssueResponse {
  number: number
  id: number
}

type IssueIdResolver = (issueNumber: number, config: GitHubRepoConfig) => Promise<number>

export class DependencyApiStrategy implements LinkPersistenceStrategy {
  private readonly octokit: NativeApiOctokit
  private readonly resolveIssueGlobalId: IssueIdResolver

  constructor(octokit: NativeApiOctokit, resolveIssueGlobalId: IssueIdResolver) {
    this.octokit = octokit
    this.resolveIssueGlobalId = resolveIssueGlobalId
  }

  createLink = async (sourceNumber: number, targetNumber: number, config: GitHubRepoConfig): Promise<void> => {
    const sourceGlobalId = await this.resolveIssueGlobalId(sourceNumber, config)

    try {
      await this.octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by', {
        owner: config.owner,
        repo: config.repo,
        issue_number: targetNumber,
        issue_id: sourceGlobalId,
      })
    }
    catch (error) {
      if (isDuplicateRelationshipError(error)) {
        return
      }
      throw mapGitHubError(error)
    }
  }

  deleteLink = async (sourceNumber: number, targetNumber: number, config: GitHubRepoConfig): Promise<void> => {
    const sourceGlobalId = await this.resolveIssueGlobalId(sourceNumber, config)

    try {
      await this.octokit.request('DELETE /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by/{issue_id}', {
        owner: config.owner,
        repo: config.repo,
        issue_number: targetNumber,
        issue_id: sourceGlobalId,
      })
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  findLinksByIssue = async (issueNumber: number, config: GitHubRepoConfig): Promise<ParsedNativeLink[]> => {
    const links: ParsedNativeLink[] = []

    const blockedByLinks = await this.fetchBlockedByLinks(issueNumber, config)
    for (const blockedByIssue of blockedByLinks) {
      links.push({
        type: 'blocks',
        owner: config.owner,
        repo: config.repo,
        issueNumber: blockedByIssue.number,
        reversed: true,
      })
    }

    const blockingLinks = await this.fetchBlockingLinks(issueNumber, config)
    for (const blockingIssue of blockingLinks) {
      links.push({
        type: 'blocks',
        owner: config.owner,
        repo: config.repo,
        issueNumber: blockingIssue.number,
      })
    }

    return links
  }

  private async fetchBlockedByLinks(issueNumber: number, config: GitHubRepoConfig): Promise<DependencyIssueResponse[]> {
    try {
      const response = await this.octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by', {
        owner: config.owner,
        repo: config.repo,
        issue_number: issueNumber,
      })
      return Array.isArray(response.data) ? response.data as DependencyIssueResponse[] : []
    }
    catch (error) {
      if (isFeatureNotEnabledError(error)) {
        return []
      }
      throw mapGitHubError(error)
    }
  }

  private async fetchBlockingLinks(issueNumber: number, config: GitHubRepoConfig): Promise<DependencyIssueResponse[]> {
    try {
      const response = await this.octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking', {
        owner: config.owner,
        repo: config.repo,
        issue_number: issueNumber,
      })
      return Array.isArray(response.data) ? response.data as DependencyIssueResponse[] : []
    }
    catch (error) {
      if (isFeatureNotEnabledError(error)) {
        return []
      }
      throw mapGitHubError(error)
    }
  }
}

function isDuplicateRelationshipError(error: unknown): boolean {
  const httpError = error as { response?: { status?: number } }
  return httpError.response?.status === 422
}

function isFeatureNotEnabledError(error: unknown): boolean {
  const httpError = error as { response?: { status?: number } }
  return httpError.response?.status === 404
}
