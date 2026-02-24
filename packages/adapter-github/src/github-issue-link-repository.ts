import type { IIssueLinkRepository, ILogger, IssueId, IssueLink, IssueLinkId } from '@meridian/core'

import type { GitHubRepoConfig } from './github-repo-config.js'
import type { ParsedLink } from './mappers/issue-link-mapper.js'
import type { GitHubIssueResponse } from './mappers/issue-mapper.js'
import type { CommentOctokit, NativeApiOctokit, ParsedNativeLink } from './strategies/link-persistence-strategy.js'

import { NotFoundError, NullLogger } from '@meridian/core'

import { generateDeterministicId, ISSUE_ID_NAMESPACE, ISSUE_LINK_ID_NAMESPACE } from './mappers/deterministic-id.js'
import { mapGitHubError } from './mappers/error-mapper.js'
import { parseIssueLinks, serializeIssueLinks, stripIssueLinkComments } from './mappers/issue-link-mapper.js'
import { toDomain } from './mappers/issue-mapper.js'
import { CommentFallbackStrategy } from './strategies/comment-fallback-strategy.js'
import { DependencyApiStrategy } from './strategies/dependency-api-strategy.js'
import { StrategyRouter } from './strategies/strategy-router.js'
import { SubIssueApiStrategy } from './strategies/sub-issue-api-strategy.js'

/**
 * Combines CommentOctokit (for body rewriting) with an optional NativeApiOctokit
 * (for dependency/sub-issue endpoints). When `request` is absent, the repository
 * falls back to comment-only persistence for all link types.
 */
interface OctokitInstance extends CommentOctokit {
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
  request?: (route: string, params?: Record<string, unknown>) => Promise<{
    data: unknown
  }>
}

const ISSUES_PER_PAGE = 100

export class GitHubIssueLinkRepository implements IIssueLinkRepository {
  private readonly octokit: OctokitInstance
  private readonly config: GitHubRepoConfig
  private readonly logger: ILogger
  private readonly issueNumberCache = new Map<IssueId, number>()
  private readonly issueGlobalIdCache = new Map<number, number>()
  private readonly strategyRouter: StrategyRouter | null
  private issueCachePopulated = false

  constructor(octokit: OctokitInstance, config: GitHubRepoConfig, logger?: ILogger) {
    this.octokit = octokit
    this.config = config
    const baseLogger = logger ?? new NullLogger()
    this.logger = baseLogger.child({ adapter: 'github', owner: config.owner, repo: config.repo, repository: 'issueLink' })
    this.strategyRouter = this.buildStrategyRouter(octokit)
  }

  create = async (link: IssueLink): Promise<IssueLink> => {
    const sourceNumber = await this.resolveIssueNumber(link.sourceIssueId)
    const targetNumber = await this.resolveIssueNumber(link.targetIssueId)

    if (this.strategyRouter !== null) {
      try {
        const strategy = this.strategyRouter.resolveStrategy(link.type)
        await strategy.createLink(sourceNumber, targetNumber, this.config)
        return link
      }
      catch (nativeError) {
        const errorMessage = nativeError instanceof Error ? nativeError.message : String(nativeError)
        this.logger.warn('Native API strategy failed, falling back to comment persistence', {
          operation: 'create',
          linkType: link.type,
          sourceNumber,
          targetNumber,
          nativeError: errorMessage,
        })
        return this.createViaCommentFallback(link, sourceNumber, targetNumber)
      }
    }

    return this.createViaCommentFallback(link, sourceNumber, targetNumber)
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
    const targetNumber = await this.resolveIssueNumber(targetIssueId)

    if (this.strategyRouter !== null) {
      try {
        const strategy = this.strategyRouter.resolveStrategy(type)
        const nativeLinks = await strategy.findLinksByIssue(sourceNumber, this.config)
        for (const parsed of nativeLinks) {
          if (parsed.issueNumber === targetNumber && !parsed.reversed) {
            return this.buildIssueLinkFromParsed(parsed, sourceIssueId)
          }
          if (parsed.reversed) {
            const reversedLink = this.buildIssueLinkFromReversedParsed(parsed, sourceIssueId)
            if (reversedLink.sourceIssueId === sourceIssueId && reversedLink.targetIssueId === targetIssueId) {
              return reversedLink
            }
          }
        }
      }
      catch {
        this.logger.warn('Native API strategy failed during find, falling through to comment parsing', {
          operation: 'findBySourceAndTargetAndType',
          linkType: type,
          sourceNumber,
          targetNumber,
        })
      }
    }

    const sourceBody = await this.fetchIssueBody(sourceNumber)
    const parsedLinks = parseIssueLinks(sourceBody, this.config)

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

    if (this.strategyRouter !== null) {
      try {
        const strategy = this.strategyRouter.resolveStrategy(link.type)
        await strategy.deleteLink(sourceNumber, targetNumber, this.config)
        return
      }
      catch (nativeError) {
        const errorMessage = nativeError instanceof Error ? nativeError.message : String(nativeError)
        this.logger.warn('Native API strategy failed during delete, falling back to comment deletion', {
          operation: 'delete',
          linkType: link.type,
          sourceNumber,
          targetNumber,
          nativeError: errorMessage,
        })
      }
    }

    await this.deleteViaCommentFallback(sourceNumber, targetNumber, link.type)
  }

  deleteByIssueId = async (issueId: IssueId): Promise<void> => {
    const issueNumber = await this.resolveIssueNumber(issueId)

    if (this.strategyRouter !== null) {
      for (const strategy of this.strategyRouter.allStrategies()) {
        try {
          const nativeLinks = await strategy.findLinksByIssue(issueNumber, this.config)
          for (const nativeLink of nativeLinks) {
            try {
              await strategy.deleteLink(issueNumber, nativeLink.issueNumber, this.config)
            }
            catch {
              // Best-effort cleanup for native links
            }
          }
        }
        catch {
          // Strategy may not support this issue
        }
      }
    }

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

  private buildStrategyRouter(octokit: OctokitInstance): StrategyRouter | null {
    if (octokit.request === undefined) {
      return null
    }

    const requestFn = octokit.request.bind(octokit) as NativeApiOctokit['request']
    const requestOctokit: NativeApiOctokit = { request: requestFn }
    const resolveGlobalId = this.resolveIssueGlobalId.bind(this)
    const dependencyStrategy = new DependencyApiStrategy(requestOctokit, resolveGlobalId, this.logger)
    const subIssueStrategy = new SubIssueApiStrategy(requestOctokit, resolveGlobalId, this.logger)

    const commentStrategies = new Map([
      ['duplicates', new CommentFallbackStrategy(octokit, 'duplicates', this.logger)],
      ['relates-to', new CommentFallbackStrategy(octokit, 'relates-to', this.logger)],
    ])

    return new StrategyRouter(dependencyStrategy, subIssueStrategy, commentStrategies)
  }

  private async createViaCommentFallback(link: IssueLink, sourceNumber: number, targetNumber: number): Promise<IssueLink> {
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

  private async deleteViaCommentFallback(sourceNumber: number, targetNumber: number, linkType: string): Promise<void> {
    const sourceBody = await this.fetchIssueBody(sourceNumber)
    const existingLinks = parseIssueLinks(sourceBody, this.config)

    const remainingLinks = existingLinks.filter(
      parsed => !(parsed.type === linkType && parsed.issueNumber === targetNumber),
    )

    const strippedBody = stripIssueLinkComments(sourceBody ?? '')
    const updatedBody = remainingLinks.length > 0
      ? `${strippedBody}\n${serializeIssueLinks(remainingLinks)}`
      : strippedBody

    await this.updateIssueBody(sourceNumber, updatedBody)
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

  private async resolveIssueGlobalId(issueNumber: number, config: GitHubRepoConfig): Promise<number> {
    const cached = this.issueGlobalIdCache.get(issueNumber)
    if (cached !== undefined) {
      return cached
    }

    try {
      const response = await this.octokit.rest.issues.get({
        owner: config.owner,
        repo: config.repo,
        issue_number: issueNumber,
      })
      const globalId = (response.data as unknown as { id: number }).id
      this.issueGlobalIdCache.set(issueNumber, globalId)
      return globalId
    }
    catch (error) {
      throw mapGitHubError(error)
    }
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
    const linksByDeterministicId = new Map<string, IssueLink>()

    for (const ghIssue of allIssues) {
      const sourceIssueId = generateDeterministicId(
        ISSUE_ID_NAMESPACE,
        `${this.config.owner}/${this.config.repo}#${ghIssue.number}`,
      ) as IssueId

      this.issueNumberCache.set(sourceIssueId, ghIssue.number)

      const issueBody = ghIssue.body ?? null
      const parsedLinks = parseIssueLinks(issueBody, this.config)
      for (const parsed of parsedLinks) {
        const link = this.buildIssueLinkFromParsed(parsed, sourceIssueId)
        linksByDeterministicId.set(link.id, link)
      }

      await this.collectNativeLinksForIssue(ghIssue.number, sourceIssueId, linksByDeterministicId)
    }

    return [...linksByDeterministicId.values()]
  }

  private async collectNativeLinksForIssue(
    issueNumber: number,
    sourceIssueId: IssueId,
    linksByDeterministicId: Map<string, IssueLink>,
  ): Promise<void> {
    if (this.strategyRouter === null) {
      return
    }

    for (const strategy of this.strategyRouter.nativeStrategies()) {
      try {
        const nativeLinks = await strategy.findLinksByIssue(issueNumber, this.config)
        for (const parsed of nativeLinks) {
          const link = parsed.reversed
            ? this.buildIssueLinkFromReversedParsed(parsed, sourceIssueId)
            : this.buildIssueLinkFromParsed(parsed, sourceIssueId)
          linksByDeterministicId.set(link.id, link)
        }
      }
      catch {
        // Native API may not be available; skip gracefully
      }
    }
  }

  private buildIssueLinkFromParsed(parsed: ParsedLink | ParsedNativeLink, sourceIssueId: IssueId): IssueLink {
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

  /**
   * Builds an IssueLink where the parsed link's issueNumber is the *source*
   * rather than the target. Used when the native API returns the inverse
   * direction (e.g., `blocked_by` returns the blocker, which is the source
   * of a `blocks` relationship from the queried issue's perspective).
   */
  private buildIssueLinkFromReversedParsed(parsed: ParsedNativeLink, callerIssueId: IssueId): IssueLink {
    const actualSourceIssueId = generateDeterministicId(
      ISSUE_ID_NAMESPACE,
      `${parsed.owner}/${parsed.repo}#${parsed.issueNumber}`,
    ) as IssueId

    const callerNumber = this.issueNumberCache.get(callerIssueId)
    const linkIdInput = `${parsed.owner}/${parsed.repo}#${parsed.issueNumber}:${parsed.type}:${this.config.owner}/${this.config.repo}#${callerNumber}`
    const linkId = generateDeterministicId(ISSUE_LINK_ID_NAMESPACE, linkIdInput) as IssueLinkId

    return {
      id: linkId,
      sourceIssueId: actualSourceIssueId,
      targetIssueId: callerIssueId,
      type: parsed.type,
      createdAt: new Date(),
    }
  }
}
