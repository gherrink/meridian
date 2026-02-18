import type { GitHubRepoConfig } from '@meridian/adapter-github'
import type { ICommentRepository, IIssueRepository, IMilestoneRepository, IUserRepository } from '@meridian/core'

import type { MeridianConfig } from './config/config-types.js'

import { generateDeterministicId, GitHubIssueRepository, GitHubMilestoneRepository, MILESTONE_ID_NAMESPACE } from '@meridian/adapter-github'
import {
  InMemoryCommentRepository,
  InMemoryIssueRepository,
  InMemoryMilestoneRepository,
  InMemoryUserRepository,
} from '@meridian/core'

import { createOctokit } from './create-octokit.js'

export interface AdapterSet {
  issueRepository: IIssueRepository
  milestoneRepository: IMilestoneRepository
  commentRepository: ICommentRepository
  userRepository: IUserRepository
}

function buildGitHubRepoConfig(config: MeridianConfig & { adapter: 'github' }): GitHubRepoConfig {
  const milestoneId = config.github.milestoneId
    ?? generateDeterministicId(MILESTONE_ID_NAMESPACE, `${config.github.owner}/${config.github.repo}`)

  return {
    owner: config.github.owner,
    repo: config.github.repo,
    milestoneId: milestoneId as GitHubRepoConfig['milestoneId'],
  }
}

// The GitHub adapter constructors accept locally-defined structural OctokitInstance
// interfaces with Record<string, unknown> params. The real Octokit from the `octokit`
// package is runtime-compatible but has stricter parameter types that cause TS
// contravariance mismatches. These type aliases extract the expected constructor
// parameter types so the cast through `unknown` is explicit and contained.
// TODO: Align the adapter-github OctokitInstance interface with the real Octokit type
// to eliminate this double-cast. Track as tech debt.
type IssueRepoOctokit = ConstructorParameters<typeof GitHubIssueRepository>[0]
type MilestoneRepoOctokit = ConstructorParameters<typeof GitHubMilestoneRepository>[0]

export function createAdapters(config: MeridianConfig): AdapterSet {
  if (config.adapter === 'github') {
    const octokit = createOctokit(config.github)
    const repoConfig = buildGitHubRepoConfig(config)

    return {
      issueRepository: new GitHubIssueRepository(octokit as unknown as IssueRepoOctokit, repoConfig),
      milestoneRepository: new GitHubMilestoneRepository(octokit as unknown as MilestoneRepoOctokit, repoConfig),
      commentRepository: new InMemoryCommentRepository(),
      userRepository: new InMemoryUserRepository(),
    }
  }

  // 'local' is a stub using the same in-memory adapters as 'memory' until adapter-local
  // is implemented with real persistence.
  return {
    issueRepository: new InMemoryIssueRepository(),
    milestoneRepository: new InMemoryMilestoneRepository(),
    commentRepository: new InMemoryCommentRepository(),
    userRepository: new InMemoryUserRepository(),
  }
}
