import type { GitHubRepoConfig } from '@meridian/adapter-github'
import type { ICommentRepository, IIssueRepository, IProjectRepository, IUserRepository } from '@meridian/core'

import type { MeridianConfig } from './config/config-types.js'

import { generateDeterministicId, GitHubIssueRepository, GitHubProjectRepository, PROJECT_ID_NAMESPACE } from '@meridian/adapter-github'
import {
  InMemoryCommentRepository,
  InMemoryIssueRepository,
  InMemoryProjectRepository,
  InMemoryUserRepository,
} from '@meridian/core'

import { createOctokit } from './create-octokit.js'

export interface AdapterSet {
  issueRepository: IIssueRepository
  projectRepository: IProjectRepository
  commentRepository: ICommentRepository
  userRepository: IUserRepository
}

function buildGitHubRepoConfig(config: MeridianConfig & { adapter: 'github' }): GitHubRepoConfig {
  const projectId = config.github.projectId
    ?? generateDeterministicId(PROJECT_ID_NAMESPACE, `${config.github.owner}/${config.github.repo}`)

  return {
    owner: config.github.owner,
    repo: config.github.repo,
    projectId: projectId as GitHubRepoConfig['projectId'],
  }
}

// The GitHub adapter constructors accept locally-defined structural OctokitInstance
// interfaces with Record<string, unknown> params. The real Octokit from the `octokit`
// package is runtime-compatible but has stricter parameter types that cause TS
// contravariance mismatches. These type aliases extract the expected constructor
// parameter types so the cast through `unknown` is explicit and contained.
type IssueRepoOctokit = ConstructorParameters<typeof GitHubIssueRepository>[0]
type ProjectRepoOctokit = ConstructorParameters<typeof GitHubProjectRepository>[0]

export function createAdapters(config: MeridianConfig): AdapterSet {
  if (config.adapter === 'github') {
    const octokit = createOctokit(config.github)
    const repoConfig = buildGitHubRepoConfig(config)

    return {
      issueRepository: new GitHubIssueRepository(octokit as unknown as IssueRepoOctokit, repoConfig),
      projectRepository: new GitHubProjectRepository(octokit as unknown as ProjectRepoOctokit, repoConfig),
      commentRepository: new InMemoryCommentRepository(),
      userRepository: new InMemoryUserRepository(),
    }
  }

  return {
    issueRepository: new InMemoryIssueRepository(),
    projectRepository: new InMemoryProjectRepository(),
    commentRepository: new InMemoryCommentRepository(),
    userRepository: new InMemoryUserRepository(),
  }
}
