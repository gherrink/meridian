import type { CreateProjectInput, Project, ProjectId, UpdateProjectInput } from '@meridian/core'

import type { GitHubRepoConfig } from '../github-repo-config.js'
import type { GitHubMilestoneResponse } from './github-types.js'

import { generateDeterministicId, PROJECT_ID_NAMESPACE } from './deterministic-id.js'

export interface OctokitMilestoneCreateParams {
  owner: string
  repo: string
  title: string
  description?: string
}

export interface OctokitMilestoneUpdateParams {
  owner: string
  repo: string
  milestone_number: number
  title?: string
  description?: string
  state?: 'open' | 'closed'
}

function generateProjectId(owner: string, repo: string, milestoneNumber: number): ProjectId {
  return generateDeterministicId(PROJECT_ID_NAMESPACE, `${owner}/${repo}#${milestoneNumber}`) as ProjectId
}

export function toDomain(githubMilestone: GitHubMilestoneResponse, config: GitHubRepoConfig): Project {
  return {
    id: generateProjectId(config.owner, config.repo, githubMilestone.number),
    name: githubMilestone.title,
    description: githubMilestone.description ?? '',
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

export function toCreateParams(input: CreateProjectInput, config: GitHubRepoConfig): OctokitMilestoneCreateParams {
  const params: OctokitMilestoneCreateParams = {
    owner: config.owner,
    repo: config.repo,
    title: input.name,
  }

  if (input.description) {
    params.description = input.description
  }

  return params
}

export function toUpdateParams(input: UpdateProjectInput, milestoneNumber: number, config: GitHubRepoConfig): OctokitMilestoneUpdateParams {
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

  return params
}
