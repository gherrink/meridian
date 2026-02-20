import type { GitHubRepoConfig } from '../github-repo-config.js'

export interface ParsedLink {
  type: string
  owner: string
  repo: string
  issueNumber: number
}

const MERIDIAN_LINK_PATTERN = /<!-- meridian:([^\s=]+)=([^\s/]+)\/([^\s#]+)#(\d+) -->/g
const MERIDIAN_LINK_LINE_PATTERN = /^[ \t]*<!-- meridian:[^\s=]+=[^\s/]+\/[^\s#]+#\d+ -->[ \t]*\r?\n?/gm

/**
 * Parses meridian link comments from an issue body.
 * @param body - The issue body text to parse.
 * @param _config - Reserved for future per-repo link filtering.
 */
export function parseIssueLinks(body: string | null, _config: GitHubRepoConfig): ParsedLink[] {
  if (!body) {
    return []
  }

  const links: ParsedLink[] = []

  for (const match of body.matchAll(MERIDIAN_LINK_PATTERN)) {
    const type = match[1]!
    const owner = match[2]!
    const repo = match[3]!
    const issueNumber = Number.parseInt(match[4]!, 10)

    links.push({ type, owner, repo, issueNumber })
  }

  return links
}

export function serializeIssueLinks(links: ParsedLink[]): string {
  return links
    .map(link => `<!-- meridian:${link.type}=${link.owner}/${link.repo}#${link.issueNumber} -->`)
    .join('\n')
}

export function stripIssueLinkComments(body: string): string {
  return body
    .replace(MERIDIAN_LINK_LINE_PATTERN, '')
    .trim()
}
