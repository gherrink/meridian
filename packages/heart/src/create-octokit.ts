import type { GitHubConfig } from './config/config-types.js'

import { Octokit } from 'octokit'

export type { Octokit }

export function createOctokit(githubConfig: GitHubConfig): Octokit {
  return new Octokit({ auth: githubConfig.token })
}
