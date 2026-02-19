import type { CreateMilestoneInput, Milestone, MilestoneId, UpdateMilestoneInput } from '@meridian/core'

import type { GitHubRepoConfig } from '../github-repo-config.js'
import type { GitHubMilestoneResponse } from './github-types.js'

import { generateDeterministicId, MILESTONE_ID_NAMESPACE } from './deterministic-id.js'

export interface OctokitMilestoneCreateParams {
  owner: string
  repo: string
  title: string
  description?: string
  due_on?: string
}

export interface OctokitMilestoneUpdateParams {
  owner: string
  repo: string
  milestone_number: number
  title?: string
  description?: string
  state?: 'open' | 'closed'
  due_on?: string | null
}

function generateMilestoneId(owner: string, repo: string, milestoneNumber: number): MilestoneId {
  return generateDeterministicId(MILESTONE_ID_NAMESPACE, `${owner}/${repo}#${milestoneNumber}`) as MilestoneId
}

function mapMilestoneStatus(githubState: string): 'open' | 'closed' {
  return githubState === 'closed' ? 'closed' : 'open'
}

function parseDueDate(dueOn: string | null | undefined): Date | null {
  if (!dueOn) {
    return null
  }
  const parsed = new Date(dueOn)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function toDomain(githubMilestone: GitHubMilestoneResponse, config: GitHubRepoConfig): Milestone {
  return {
    id: generateMilestoneId(config.owner, config.repo, githubMilestone.number),
    name: githubMilestone.title,
    description: githubMilestone.description ?? '',
    status: mapMilestoneStatus(githubMilestone.state),
    dueDate: parseDueDate(githubMilestone.due_on),
    metadata: {
      github_milestone_number: githubMilestone.number,
      github_url: githubMilestone.html_url,
      github_state: githubMilestone.state,
      github_open_issues: githubMilestone.open_issues,
      github_closed_issues: githubMilestone.closed_issues,
    },
    createdAt: new Date(githubMilestone.created_at),
    updatedAt: new Date(githubMilestone.updated_at),
  }
}

export function toCreateParams(input: CreateMilestoneInput, config: GitHubRepoConfig): OctokitMilestoneCreateParams {
  const params: OctokitMilestoneCreateParams = {
    owner: config.owner,
    repo: config.repo,
    title: input.name,
  }

  if (input.description) {
    params.description = input.description
  }

  if (input.dueDate) {
    params.due_on = input.dueDate.toISOString()
  }

  return params
}

export function toUpdateParams(input: UpdateMilestoneInput, milestoneNumber: number, config: GitHubRepoConfig): OctokitMilestoneUpdateParams {
  const params: OctokitMilestoneUpdateParams = {
    owner: config.owner,
    repo: config.repo,
    milestone_number: milestoneNumber,
  }

  if (input.name !== undefined) {
    params.title = input.name
  }

  if (input.description !== undefined) {
    params.description = input.description
  }

  if (input.status !== undefined) {
    params.state = input.status
  }

  if (input.dueDate !== undefined) {
    params.due_on = input.dueDate ? input.dueDate.toISOString() : null
  }

  return params
}
