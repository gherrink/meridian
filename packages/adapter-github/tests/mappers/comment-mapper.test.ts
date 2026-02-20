import type { IssueId, MilestoneId, UserId } from '@meridian/core'

import type { GitHubCommentResponse, GitHubUserResponse } from '../../src/mappers/github-types.js'

import { describe, expect, it } from 'vitest'

import { toCreateParams, toDomain, toUpdateParams } from '../../src/mappers/comment-mapper.js'
import { generateUserIdFromLogin } from '../../src/mappers/user-mapper.js'

const UUID_V5_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const TEST_MILESTONE_ID = '550e8400-e29b-41d4-a716-446655440003' as MilestoneId

const TEST_CONFIG = {
  owner: 'test-owner',
  repo: 'test-repo',
  milestoneId: TEST_MILESTONE_ID,
}

const TEST_ISSUE_ID = '660e8400-e29b-41d4-a716-446655440001' as IssueId

const USER_FIXTURE: GitHubUserResponse = {
  login: 'octocat',
  id: 1,
  avatar_url: 'https://avatars.githubusercontent.com/u/1',
  html_url: 'https://github.com/octocat',
  type: 'User',
  site_admin: false,
}

const COMMENT_FIXTURE: GitHubCommentResponse = {
  id: 100,
  body: 'Looks good!',
  user: USER_FIXTURE,
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-15T14:30:00Z',
  html_url: 'https://github.com/test-owner/test-repo/issues/42#issuecomment-100',
}

describe('commentMapper', () => {
  describe('toDomain', () => {
    it('cM-01: maps body', () => {
      const result = toDomain(COMMENT_FIXTURE, TEST_ISSUE_ID, TEST_CONFIG)

      expect(result.body).toBe('Looks good!')
    })

    it('cM-02: empty body fallback', () => {
      const commentWithEmptyBody: GitHubCommentResponse = { ...COMMENT_FIXTURE, body: '' }

      const result = toDomain(commentWithEmptyBody, TEST_ISSUE_ID, TEST_CONFIG)

      expect(result.body).toBe('(empty comment)')
    })

    it('cM-03: null user -> deleted user id', () => {
      const commentWithNullUser: GitHubCommentResponse = { ...COMMENT_FIXTURE, user: null }

      const result = toDomain(commentWithNullUser, TEST_ISSUE_ID, TEST_CONFIG)

      expect(result.authorId).toMatch(UUID_V5_REGEX)
    })

    it('cM-04: authorId from user.login', () => {
      const result = toDomain(COMMENT_FIXTURE, TEST_ISSUE_ID, TEST_CONFIG)
      const expectedUserId = generateUserIdFromLogin('octocat', TEST_CONFIG)

      expect(result.authorId).toBe(expectedUserId)
    })

    it('cM-05: deterministic id', () => {
      const first = toDomain(COMMENT_FIXTURE, TEST_ISSUE_ID, TEST_CONFIG)
      const second = toDomain(COMMENT_FIXTURE, TEST_ISSUE_ID, TEST_CONFIG)

      expect(first.id).toBe(second.id)
    })
  })

  describe('toCreateParams', () => {
    it('cM-06: maps issue_number and body', () => {
      const input = {
        body: 'New comment',
        authorId: '770e8400-e29b-41d4-a716-446655440001' as UserId,
        issueId: TEST_ISSUE_ID,
      }

      const result = toCreateParams(input, 42, TEST_CONFIG)

      expect(result.issue_number).toBe(42)
      expect(result.body).toBe('New comment')
    })
  })

  describe('toUpdateParams', () => {
    it('cM-07: body undefined -> omitted', () => {
      const result = toUpdateParams({}, 100, TEST_CONFIG)

      expect(result.body).toBeUndefined()
    })
  })
})
