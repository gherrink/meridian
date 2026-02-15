import type { User, UserId } from '@meridian/core'

import type { GitHubRepoConfig } from '../github-repo-config.js'
import type { GitHubUserResponse } from './github-types.js'

import { generateDeterministicId, USER_ID_NAMESPACE } from './deterministic-id.js'

function generateUserId(owner: string, repo: string, login: string): UserId {
  return generateDeterministicId(USER_ID_NAMESPACE, `${owner}/${repo}#${login}`) as UserId
}

function generateDeletedUserId(owner: string, repo: string, commentId: number): UserId {
  return generateDeterministicId(USER_ID_NAMESPACE, `${owner}/${repo}#deleted-${commentId}`) as UserId
}

export function toDomain(githubUser: GitHubUserResponse, config: GitHubRepoConfig): User {
  return {
    id: generateUserId(config.owner, config.repo, githubUser.login),
    name: githubUser.login,
    email: null,
    avatarUrl: githubUser.avatar_url || null,
  }
}

export function toDomainFromDeletedUser(commentId: number, config: GitHubRepoConfig): User {
  return {
    id: generateDeletedUserId(config.owner, config.repo, commentId),
    name: 'Deleted User',
    email: null,
    avatarUrl: null,
  }
}

export function generateUserIdFromLogin(login: string, config: GitHubRepoConfig): UserId {
  return generateUserId(config.owner, config.repo, login)
}
