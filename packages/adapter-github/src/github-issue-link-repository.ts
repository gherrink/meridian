import type { IIssueLinkRepository, IssueId, IssueLink, IssueLinkId } from '@meridian/core'

import type { GitHubRepoConfig } from './github-repo-config.js'
import type { ParsedLink } from './mappers/issue-link-mapper.js'
import type { GitHubIssueResponse } from './mappers/issue-mapper.js'

import { NotFoundError } from '@meridian/core'

import { generateDeterministicId, ISSUE_ID_NAMESPACE, ISSUE_LINK_ID_NAMESPACE } from './mappers/deterministic-id.js'
import { mapGitHubError } from './mappers/error-mapper.js'
import { parseIssueLinks, serializeIssueLinks, stripIssueLinkComments } from './mappers/issue-link-mapper.js'
import { toDomain } from './mappers/issue-mapper.js'

interface OctokitInstance {
  rest: {
    issues: {
      get: (params: { owner: string, repo: string, issue_number: number }) => Promise<{ data: GitHubIssueResponse }>
      update: (params: Record<string, unknown>) => Promise<{ data: GitHubIssueResponse }>
      listForRepo: (params: Record<string, unknown>) => Promise<{
        data: GitHubIssueResponse[]
        headers: Record<string, string | undefined>
      }>
    }
  }
}

const ISSUES_PER_PAGE = 100

export class GitHubIssueLinkRepository implements IIssueLinkRepository {
  private readonly octokit: OctokitInstance
  private readonly config: GitHubRepoConfig
  private readonly issueNumberCache = new Map<IssueId, number>()
  private issueCachePopulated = false

  constructor(octokit: OctokitInstance, config: GitHubRepoConfig) {
    this.octokit = octokit
    this.config = config
  }

  create = async (link: IssueLink): Promise<IssueLink> => {
    const sourceNumber = await this.resolveIssueNumber(link.sourceIssueId)
    const targetNumber = await this.resolveIssueNumber(link.targetIssueId)

    const sourceBody = await this.fetchIssueBody(sourceNumber)
    const existingLinks = parseIssueLinks(sourceBody, this.config)

    const newParsedLink: ParsedLink = {
      type: link.type,
      owner: this.config.owner,
      repo: this.config.repo,
      issueNumber: targetNumber,
    }

    const allLinks = [...existingLinks, newParsedLink]
    const strippedBody = stripIssueLinkComments(sourceBody ?? '')
    const linkComments = serializeIssueLinks(allLinks)
    const updatedBody = strippedBody
      ? `${strippedBody}\n${linkComments}`
      : linkComments

    await this.updateIssueBody(sourceNumber, updatedBody)

    return link
  }

  findById = async (id: IssueLinkId): Promise<IssueLink | null> => {
    const allLinks = await this.scanAllIssuesForLinks()

    for (const link of allLinks) {
      if (link.id === id) {
        return link
      }
    }

    return null
  }

  findByIssueId = async (issueId: IssueId, filter?: { type?: string }): Promise<IssueLink[]> => {
    const allLinks = await this.scanAllIssuesForLinks()

    return allLinks.filter((link) => {
      const involvesIssue = link.sourceIssueId === issueId || link.targetIssueId === issueId
      if (!involvesIssue) {
        return false
      }
      if (filter?.type !== undefined && link.type !== filter.type) {
        return false
      }
      return true
    })
  }

  findBySourceAndTargetAndType = async (
    sourceIssueId: IssueId,
    targetIssueId: IssueId,
    type: string,
  ): Promise<IssueLink | null> => {
    const sourceNumber = await this.resolveIssueNumber(sourceIssueId)
    const sourceBody = await this.fetchIssueBody(sourceNumber)
    const parsedLinks = parseIssueLinks(sourceBody, this.config)
    const targetNumber = await this.resolveIssueNumber(targetIssueId)

    for (const parsed of parsedLinks) {
      if (parsed.type === type && parsed.issueNumber === targetNumber) {
        return this.buildIssueLinkFromParsed(parsed, sourceIssueId)
      }
    }

    return null
  }

  delete = async (id: IssueLinkId): Promise<void> => {
    const link = await this.findById(id)
    if (!link) {
      throw new NotFoundError('IssueLink', id)
    }

    const sourceNumber = await this.resolveIssueNumber(link.sourceIssueId)
    const targetNumber = await this.resolveIssueNumber(link.targetIssueId)

    const sourceBody = await this.fetchIssueBody(sourceNumber)
    const existingLinks = parseIssueLinks(sourceBody, this.config)

    const remainingLinks = existingLinks.filter(
      parsed => !(parsed.type === link.type && parsed.issueNumber === targetNumber),
    )

    const strippedBody = stripIssueLinkComments(sourceBody ?? '')
    const updatedBody = remainingLinks.length > 0
      ? `${strippedBody}\n${serializeIssueLinks(remainingLinks)}`
      : strippedBody

    await this.updateIssueBody(sourceNumber, updatedBody)
  }

  deleteByIssueId = async (issueId: IssueId): Promise<void> => {
    const issueNumber = await this.resolveIssueNumber(issueId)

    const outgoingBody = await this.fetchIssueBody(issueNumber)
    const outgoingLinks = parseIssueLinks(outgoingBody, this.config)

    if (outgoingLinks.length > 0) {
      const strippedBody = stripIssueLinkComments(outgoingBody ?? '')
      await this.updateIssueBody(issueNumber, strippedBody)
    }

    const allIssues = await this.fetchAllIssues()
    for (const ghIssue of allIssues) {
      const issueBody = ghIssue.body ?? null
      const incomingLinks = parseIssueLinks(issueBody, this.config)
      const linksPointingToIssue = incomingLinks.filter(
        parsed => parsed.issueNumber === issueNumber,
      )

      if (linksPointingToIssue.length > 0) {
        const remainingLinks = incomingLinks.filter(
          parsed => parsed.issueNumber !== issueNumber,
        )
        const strippedBody = stripIssueLinkComments(issueBody ?? '')
        const updatedBody = remainingLinks.length > 0
          ? `${strippedBody}\n${serializeIssueLinks(remainingLinks)}`
          : strippedBody

        await this.updateIssueBody(ghIssue.number, updatedBody)
      }
    }
  }

  populateCache(issueId: IssueId, githubNumber: number): void {
    this.issueNumberCache.set(issueId, githubNumber)
  }

  private async resolveIssueNumber(issueId: IssueId): Promise<number> {
    const cached = this.issueNumberCache.get(issueId)
    if (cached !== undefined) {
      return cached
    }

    await this.populateIssueCacheFromApi()

    const resolved = this.issueNumberCache.get(issueId)
    if (resolved === undefined) {
      throw new NotFoundError('Issue', issueId)
    }

    return resolved
  }

  private async fetchIssueBody(issueNumber: number): Promise<string | null> {
    try {
      const response = await this.octokit.rest.issues.get({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
      })
      return response.data.body ?? null
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  private async updateIssueBody(issueNumber: number, body: string): Promise<void> {
    try {
      await this.octokit.rest.issues.update({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: issueNumber,
        body,
      })
    }
    catch (error) {
      throw mapGitHubError(error)
    }
  }

  private async fetchAllIssues(): Promise<GitHubIssueResponse[]> {
    const allIssues: GitHubIssueResponse[] = []
    let page = 1
    let hasMorePages = true

    try {
      while (hasMorePages) {
        const response = await this.octokit.rest.issues.listForRepo({
          owner: this.config.owner,
          repo: this.config.repo,
          state: 'all',
          per_page: ISSUES_PER_PAGE,
          page,
        })

        const items = response?.data
        if (!Array.isArray(items)) {
          break
        }

        for (const item of items) {
          if (!('pull_request' in item)) {
            allIssues.push(item)
          }
        }

        hasMorePages = items.length === ISSUES_PER_PAGE
        page++
      }
    }
    catch (error) {
      throw mapGitHubError(error)
    }

    return allIssues
  }

  private async populateIssueCacheFromApi(): Promise<void> {
    if (this.issueCachePopulated) {
      return
    }

    const allIssues = await this.fetchAllIssues()

    for (const item of allIssues) {
      const issue = toDomain(item, this.config)
      this.issueNumberCache.set(issue.id, item.number)
    }

    this.issueCachePopulated = true
  }

  private async scanAllIssuesForLinks(): Promise<IssueLink[]> {
    const allIssues = await this.fetchAllIssues()
    const links: IssueLink[] = []

    for (const ghIssue of allIssues) {
      const sourceIssueId = generateDeterministicId(
        ISSUE_ID_NAMESPACE,
        `${this.config.owner}/${this.config.repo}#${ghIssue.number}`,
      ) as IssueId

      this.issueNumberCache.set(sourceIssueId, ghIssue.number)

      const issueBody = ghIssue.body ?? null
      const parsedLinks = parseIssueLinks(issueBody, this.config)
      for (const parsed of parsedLinks) {
        links.push(this.buildIssueLinkFromParsed(parsed, sourceIssueId))
      }
    }

    return links
  }

  private buildIssueLinkFromParsed(parsed: ParsedLink, sourceIssueId: IssueId): IssueLink {
    const targetIssueId = generateDeterministicId(
      ISSUE_ID_NAMESPACE,
      `${parsed.owner}/${parsed.repo}#${parsed.issueNumber}`,
    ) as IssueId

    const sourceNumber = this.issueNumberCache.get(sourceIssueId)
    const linkIdInput = `${this.config.owner}/${this.config.repo}#${sourceNumber}:${parsed.type}:${parsed.owner}/${parsed.repo}#${parsed.issueNumber}`
    const linkId = generateDeterministicId(ISSUE_LINK_ID_NAMESPACE, linkIdInput) as IssueLinkId

    return {
      id: linkId,
      sourceIssueId,
      targetIssueId,
      type: parsed.type,
      createdAt: new Date(),
    }
  }
}
