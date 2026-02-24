import type { ILogger } from '@meridian/core'

import type { GitHubRepoConfig } from '../github-repo-config.js'
import type { CommentOctokit, LinkPersistenceStrategy, ParsedNativeLink } from './link-persistence-strategy.js'

import { NullLogger } from '@meridian/core'

import { mapGitHubError } from '../mappers/error-mapper.js'
import { parseIssueLinks, serializeIssueLinks, stripIssueLinkComments } from '../mappers/issue-link-mapper.js'

export class CommentFallbackStrategy implements LinkPersistenceStrategy {
  private readonly octokit: CommentOctokit
  private readonly linkType: string
  private readonly logger: ILogger

  constructor(octokit: CommentOctokit, linkType: string, logger?: ILogger) {
    this.octokit = octokit
    this.linkType = linkType
    this.logger = logger ?? new NullLogger()
  }

  createLink = async (sourceNumber: number, targetNumber: number, config: GitHubRepoConfig): Promise<void> => {
    this.logger.debug('Creating link via comment body rewrite', {
      operation: 'createLink',
      strategy: 'comment-fallback',
      linkType: this.linkType,
      sourceNumber,
      targetNumber,
    })

    const body = await this.fetchIssueBody(sourceNumber, config)
    const existingLinks = parseIssueLinks(body, config)

    const newLink = {
      type: this.linkType,
      owner: config.owner,
      repo: config.repo,
      issueNumber: targetNumber,
    }

    const allLinks = [...existingLinks, newLink]
    const strippedBody = stripIssueLinkComments(body ?? '')
    const linkComments = serializeIssueLinks(allLinks)
    const updatedBody = strippedBody
      ? `${strippedBody}\n${linkComments}`
      : linkComments

    await this.updateIssueBody(sourceNumber, updatedBody, config)
  }

  deleteLink = async (sourceNumber: number, targetNumber: number, config: GitHubRepoConfig): Promise<void> => {
    this.logger.debug('Deleting link via comment body rewrite', {
      operation: 'deleteLink',
      strategy: 'comment-fallback',
      linkType: this.linkType,
      sourceNumber,
      targetNumber,
    })

    const body = await this.fetchIssueBody(sourceNumber, config)
    const existingLinks = parseIssueLinks(body, config)

    const remainingLinks = existingLinks.filter(
      parsed => !(parsed.type === this.linkType && parsed.issueNumber === targetNumber),
    )

    const strippedBody = stripIssueLinkComments(body ?? '')
    const updatedBody = remainingLinks.length > 0
      ? `${strippedBody}\n${serializeIssueLinks(remainingLinks)}`
      : strippedBody

    await this.updateIssueBody(sourceNumber, updatedBody, config)
  }

  findLinksByIssue = async (issueNumber: number, config: GitHubRepoConfig): Promise<ParsedNativeLink[]> => {
    const body = await this.fetchIssueBody(issueNumber, config)
    const parsedLinks = parseIssueLinks(body, config)

    return parsedLinks
      .filter(parsed => parsed.type === this.linkType)
      .map(parsed => ({
        type: parsed.type,
        owner: parsed.owner,
        repo: parsed.repo,
        issueNumber: parsed.issueNumber,
      }))
  }

  private async fetchIssueBody(issueNumber: number, config: GitHubRepoConfig): Promise<string | null> {
    try {
      const response = await this.octokit.rest.issues.get({
        owner: config.owner,
        repo: config.repo,
        issue_number: issueNumber,
      })
      return response.data.body ?? null
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  private async updateIssueBody(issueNumber: number, body: string, config: GitHubRepoConfig): Promise<void> {
    try {
      await this.octokit.rest.issues.update({
        owner: config.owner,
        repo: config.repo,
        issue_number: issueNumber,
        body,
      })
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }
}
