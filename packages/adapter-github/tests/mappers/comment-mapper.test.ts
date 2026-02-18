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

    it('cM-02: maps issueId', () => {
      const result = toDomain(COMMENT_FIXTURE, TEST_ISSUE_ID, TEST_CONFIG)

      expect(result.issueId).toBe(TEST_ISSUE_ID)
    })

    it('cM-03: maps createdAt as Date', () => {
      const result = toDomain(COMMENT_FIXTURE, TEST_ISSUE_ID, TEST_CONFIG)

      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.createdAt.toISOString()).toBe('2025-06-01T10:00:00.000Z')
    })

    it('cM-04: maps updatedAt as Date', () => {
      const result = toDomain(COMMENT_FIXTURE, TEST_ISSUE_ID, TEST_CONFIG)

      expect(result.updatedAt).toBeInstanceOf(Date)
      expect(result.updatedAt.toISOString()).toBe('2025-06-15T14:30:00.000Z')
    })

    it('cM-05: id is deterministic UUID', () => {
      const first = toDomain(COMMENT_FIXTURE, TEST_ISSUE_ID, TEST_CONFIG)
      const second = toDomain(COMMENT_FIXTURE, TEST_ISSUE_ID, TEST_CONFIG)

      expect(first.id).toBe(second.id)
    })

    it('cM-06: id differs for different comment id', () => {
      const comment200: GitHubCommentResponse = { ...COMMENT_FIXTURE, id: 200 }

      const result100 = toDomain(COMMENT_FIXTURE, TEST_ISSUE_ID, TEST_CONFIG)
      const result200 = toDomain(comment200, TEST_ISSUE_ID, TEST_CONFIG)

      expect(result100.id).not.toBe(result200.id)
    })

    it('cM-07: authorId derived from user.login', () => {
      const result = toDomain(COMMENT_FIXTURE, TEST_ISSUE_ID, TEST_CONFIG)
      const expectedUserId = generateUserIdFromLogin('octocat', TEST_CONFIG)

      expect(result.authorId).toBe(expectedUserId)
    })

    it('cM-08: null user maps to deleted user', () => {
      const commentWithNullUser: GitHubCommentResponse = { ...COMMENT_FIXTURE, user: null }

      const result = toDomain(commentWithNullUser, TEST_ISSUE_ID, TEST_CONFIG)

      expect(result.authorId).toMatch(UUID_V5_REGEX)
    })

    it('cM-09: empty body gets fallback value', () => {
      const commentWithEmptyBody: GitHubCommentResponse = { ...COMMENT_FIXTURE, body: '' }

      const result = toDomain(commentWithEmptyBody, TEST_ISSUE_ID, TEST_CONFIG)

      expect(typeof result.body).toBe('string')
      expect(result.body.length).toBeGreaterThan(0)
    })
  })

  describe('toCreateParams', () => {
    it('cM-10: maps owner and repo from config', () => {
      const input = {
        body: 'New comment',
        authorId: '770e8400-e29b-41d4-a716-446655440001' as UserId,
        issueId: TEST_ISSUE_ID,
      }

      const result = toCreateParams(input, 42, TEST_CONFIG)

      expect(result.owner).toBe('test-owner')
      expect(result.repo).toBe('test-repo')
    })

    it('cM-11: maps issue_number', () => {
      const input = {
        body: 'New comment',
        authorId: '770e8400-e29b-41d4-a716-446655440001' as UserId,
        issueId: TEST_ISSUE_ID,
      }

      const result = toCreateParams(input, 42, TEST_CONFIG)

      expect(result.issue_number).toBe(42)
    })

    it('cM-12: maps body', () => {
      const input = {
        body: 'New comment',
        authorId: '770e8400-e29b-41d4-a716-446655440001' as UserId,
        issueId: TEST_ISSUE_ID,
      }

      const result = toCreateParams(input, 42, TEST_CONFIG)

      expect(result.body).toBe('New comment')
    })
  })

  describe('toUpdateParams', () => {
    it('cM-13: maps comment_id', () => {
      const result = toUpdateParams({ body: 'Updated' }, 100, TEST_CONFIG)

      expect(result.comment_id).toBe(100)
    })

    it('cM-14: maps body from input', () => {
      const result = toUpdateParams({ body: 'Updated' }, 100, TEST_CONFIG)

      expect(result.body).toBe('Updated')
    })

    it('cM-15: undefined body is omitted', () => {
      const result = toUpdateParams({}, 100, TEST_CONFIG)

      expect(result.body).toBeUndefined()
    })

    it('cM-16: includes owner and repo', () => {
      const result = toUpdateParams({ body: 'Updated' }, 100, TEST_CONFIG)

      expect(result.owner).toBe('test-owner')
      expect(result.repo).toBe('test-repo')
    })
  })

  describe('edge cases', () => {
    it('eC-02: comment with null user produces valid domain Comment', () => {
      const commentNullUser: GitHubCommentResponse = {
        id: 999,
        body: 'Test body',
        user: null,
        created_at: '2025-06-01T10:00:00Z',
        updated_at: '2025-06-01T10:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/issues/1#issuecomment-999',
      }

      const result = toDomain(commentNullUser, TEST_ISSUE_ID, TEST_CONFIG)

      expect(result.authorId).toMatch(UUID_V5_REGEX)
      expect(typeof result.body).toBe('string')
    })
  })
})
