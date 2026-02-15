import type { CreateIssueInput, Issue, IssueId, UpdateIssueInput, UserId } from '@meridian/core'

import type { GitHubRepoConfig } from '../github-repo-config.js'

import type { GitHubLabel } from './github-types.js'

import { generateDeterministicId, ISSUE_ID_NAMESPACE } from './deterministic-id.js'
import { normalizeLabels } from './github-types.js'
import { extractPriority, extractStatus, extractTags, toPriorityLabel, toStatusLabels } from './label-mapper.js'
import { generateUserIdFromLogin } from './user-mapper.js'

export { normalizeLabels } from './github-types.js'

export interface GitHubIssueResponse {
  number: number
  title: string
  body?: string | null
  state: string
  labels: Array<GitHubLabel | string>
  assignees?: Array<{ login?: string, id?: number }> | null
  milestone?: { title?: string, number?: number } | null
  html_url?: string
  reactions?: { total_count?: number } | null
  locked?: boolean
  created_at: string
  updated_at: string
}

export interface OctokitCreateParams {
  owner: string
  repo: string
  title: string
  body?: string
  labels?: string[]
  assignees?: string[]
}

export interface OctokitUpdateParams {
  owner: string
  repo: string
  issue_number: number
  title?: string
  body?: string
  state?: 'open' | 'closed'
  labels?: string[]
}

function generateIssueId(owner: string, repo: string, issueNumber: number): IssueId {
  return generateDeterministicId(ISSUE_ID_NAMESPACE, `${owner}/${repo}#${issueNumber}`) as IssueId
}

function mapAssigneeIds(assignees: Array<{ login?: string, id?: number }> | null | undefined, config: GitHubRepoConfig): UserId[] {
  if (assignees === null || assignees === undefined) {
    return []
  }

  return assignees
    .filter(assignee => assignee.login !== undefined && assignee.login !== '')
    .map(assignee => generateUserIdFromLogin(assignee.login!, config))
}

export function toDomain(githubIssue: GitHubIssueResponse, config: GitHubRepoConfig): Issue {
  const normalizedLabels = normalizeLabels(githubIssue.labels)

  return {
    id: generateIssueId(config.owner, config.repo, githubIssue.number),
    projectId: config.projectId,
    title: githubIssue.title,
    description: githubIssue.body ?? '',
    status: extractStatus(githubIssue.state, normalizedLabels),
    priority: extractPriority(normalizedLabels),
    assigneeIds: mapAssigneeIds(githubIssue.assignees, config),
    tags: extractTags(normalizedLabels),
    dueDate: null,
    metadata: {
      github_number: githubIssue.number,
      github_url: githubIssue.html_url ?? null,
      github_reactions: githubIssue.reactions?.total_count ?? 0,
      github_locked: githubIssue.locked ?? false,
      github_milestone: githubIssue.milestone?.title ?? null,
    },
    createdAt: new Date(githubIssue.created_at),
    updatedAt: new Date(githubIssue.updated_at),
  }
}

export function toCreateParams(input: CreateIssueInput, config: GitHubRepoConfig): OctokitCreateParams {
  const labels: string[] = []

  if (input.priority !== undefined && input.priority !== 'normal') {
    labels.push(toPriorityLabel(input.priority))
  }

  if (input.status !== undefined && input.status !== 'open') {
    labels.push(...toStatusLabels(input.status))
  }

  for (const tag of input.tags ?? []) {
    labels.push(tag.name)
  }

  const params: OctokitCreateParams = {
    owner: config.owner,
    repo: config.repo,
    title: input.title,
  }

  if (input.description) {
    params.body = input.description
  }

  if (labels.length > 0) {
    params.labels = labels
  }

  return params
}

export function toUpdateParams(
  input: UpdateIssueInput,
  issueNumber: number,
  config: GitHubRepoConfig,
  currentLabels: GitHubLabel[],
): OctokitUpdateParams {
  const params: OctokitUpdateParams = {
    owner: config.owner,
    repo: config.repo,
    issue_number: issueNumber,
  }

  if (input.title !== undefined) {
    params.title = input.title
  }

  if (input.description !== undefined) {
    params.body = input.description
  }

  if (input.status !== undefined) {
    params.state = input.status === 'closed' ? 'closed' : 'open'
  }

  if (input.priority !== undefined || input.status !== undefined || input.tags !== undefined) {
    const existingNonManagedLabels = currentLabels
      .filter((label) => {
        const name = label.name?.toLowerCase() ?? ''
        return !name.startsWith('priority:') && !name.startsWith('status:')
      })
      .map(label => label.name ?? '')

    const newLabels: string[] = []

    if (input.tags !== undefined) {
      for (const tag of input.tags) {
        newLabels.push(tag.name)
      }
    }
    else {
      newLabels.push(...existingNonManagedLabels)
    }

    const priority = input.priority
    if (priority !== undefined && priority !== 'normal') {
      newLabels.push(toPriorityLabel(priority))
    }
    else if (priority === undefined) {
      const existingPriority = currentLabels
        .filter(label => label.name?.toLowerCase().startsWith('priority:'))
        .map(label => label.name ?? '')
      newLabels.push(...existingPriority)
    }

    const status = input.status
    if (status !== undefined) {
      newLabels.push(...toStatusLabels(status))
    }
    else {
      const existingStatus = currentLabels
        .filter(label => label.name?.toLowerCase().startsWith('status:'))
        .map(label => label.name ?? '')
      newLabels.push(...existingStatus)
    }

    params.labels = newLabels
  }

  return params
}

export function extractIssueNumber(issue: Issue): number | undefined {
  const githubNumber = issue.metadata?.github_number
  if (typeof githubNumber === 'number') {
    return githubNumber
  }
  return undefined
}
