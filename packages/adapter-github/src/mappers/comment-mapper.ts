import type { Comment, CommentId, CreateCommentInput, IssueId, UpdateCommentInput } from '@meridian/core'

import type { GitHubRepoConfig } from '../github-repo-config.js'
import type { GitHubCommentResponse } from './github-types.js'

import { COMMENT_ID_NAMESPACE, generateDeterministicId } from './deterministic-id.js'
import { toDomainFromDeletedUser, toDomain as userToDomain } from './user-mapper.js'

export interface OctokitCommentCreateParams {
  owner: string
  repo: string
  issue_number: number
  body: string
}

export interface OctokitCommentUpdateParams {
  owner: string
  repo: string
  comment_id: number
  body?: string
}

function generateCommentId(owner: string, repo: string, githubCommentId: number): CommentId {
  return generateDeterministicId(COMMENT_ID_NAMESPACE, `${owner}/${repo}#${githubCommentId}`) as CommentId
}

export function toDomain(githubComment: GitHubCommentResponse, issueId: IssueId, config: GitHubRepoConfig): Comment {
  const author = githubComment.user !== null
    ? userToDomain(githubComment.user, config)
    : toDomainFromDeletedUser(githubComment.id, config)

  return {
    id: generateCommentId(config.owner, config.repo, githubComment.id),
    body: githubComment.body || '(empty comment)',
    authorId: author.id,
    issueId,
    createdAt: new Date(githubComment.created_at),
    updatedAt: new Date(githubComment.updated_at),
  }
}

export function toCreateParams(input: CreateCommentInput, issueNumber: number, config: GitHubRepoConfig): OctokitCommentCreateParams {
  return {
    owner: config.owner,
    repo: config.repo,
    issue_number: issueNumber,
    body: input.body,
  }
}

export function toUpdateParams(input: UpdateCommentInput, commentId: number, config: GitHubRepoConfig): OctokitCommentUpdateParams {
  const params: OctokitCommentUpdateParams = {
    owner: config.owner,
    repo: config.repo,
    comment_id: commentId,
  }

  if (input.body !== undefined) {
    params.body = input.body
  }

  return params
}
