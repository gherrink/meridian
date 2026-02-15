import type { ProjectId } from '@meridian/core'

import type { GitHubUserResponse } from '../../src/mappers/github-types.js'

import { describe, expect, it } from 'vitest'

import { generateUserIdFromLogin, toDomain, toDomainFromDeletedUser } from '../../src/mappers/user-mapper.js'

const UUID_V5_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440003' as ProjectId

const TEST_CONFIG = {
  owner: 'test-owner',
  repo: 'test-repo',
  projectId: TEST_PROJECT_ID,
}

const USER_FIXTURE: GitHubUserResponse = {
  login: 'octocat',
  id: 1,
  avatar_url: 'https://avatars.githubusercontent.com/u/1',
  html_url: 'https://github.com/octocat',
  type: 'User',
  site_admin: false,
}

describe('userMapper', () => {
  describe('toDomain', () => {
    it('uM-01: maps login to name', () => {
      const result = toDomain(USER_FIXTURE, TEST_CONFIG)

      expect(result.name).toBe('octocat')
    })

    it('uM-02: maps avatar_url', () => {
      const user: GitHubUserResponse = { ...USER_FIXTURE, avatar_url: 'https://example.com/avatar.png' }

      const result = toDomain(user, TEST_CONFIG)

      expect(result.avatarUrl).toBe('https://example.com/avatar.png')
    })

    it('uM-03: email is always null', () => {
      const result = toDomain(USER_FIXTURE, TEST_CONFIG)

      expect(result.email).toBe(null)
    })

    it('uM-04: id is deterministic UUID', () => {
      const first = toDomain(USER_FIXTURE, TEST_CONFIG)
      const second = toDomain(USER_FIXTURE, TEST_CONFIG)

      expect(first.id).toBe(second.id)
    })

    it('uM-05: id differs for different login', () => {
      const alice: GitHubUserResponse = { ...USER_FIXTURE, login: 'alice' }
      const bob: GitHubUserResponse = { ...USER_FIXTURE, login: 'bob' }

      const resultAlice = toDomain(alice, TEST_CONFIG)
      const resultBob = toDomain(bob, TEST_CONFIG)

      expect(resultAlice.id).not.toBe(resultBob.id)
    })

    it('uM-06: id differs for different repo', () => {
      const configA = { ...TEST_CONFIG, repo: 'repo-a' }
      const configB = { ...TEST_CONFIG, repo: 'repo-b' }

      const resultA = toDomain(USER_FIXTURE, configA)
      const resultB = toDomain(USER_FIXTURE, configB)

      expect(resultA.id).not.toBe(resultB.id)
    })

    it('uM-07: handles empty avatar_url', () => {
      const user: GitHubUserResponse = { ...USER_FIXTURE, avatar_url: '' }

      const result = toDomain(user, TEST_CONFIG)

      expect(result.avatarUrl).toBe(null)
    })
  })

  describe('toDomainFromDeletedUser', () => {
    it('uM-08: name is Deleted User', () => {
      const result = toDomainFromDeletedUser(100, TEST_CONFIG)

      expect(result.name).toBe('Deleted User')
    })

    it('uM-09: email is null', () => {
      const result = toDomainFromDeletedUser(100, TEST_CONFIG)

      expect(result.email).toBe(null)
    })

    it('uM-10: avatarUrl is null', () => {
      const result = toDomainFromDeletedUser(100, TEST_CONFIG)

      expect(result.avatarUrl).toBe(null)
    })

    it('uM-11: id is deterministic', () => {
      const first = toDomainFromDeletedUser(100, TEST_CONFIG)
      const second = toDomainFromDeletedUser(100, TEST_CONFIG)

      expect(first.id).toBe(second.id)
    })

    it('uM-12: id differs from real user', () => {
      const deletedUser = toDomainFromDeletedUser(1, TEST_CONFIG)
      const realUser = toDomain(USER_FIXTURE, TEST_CONFIG)

      expect(deletedUser.id).not.toBe(realUser.id)
    })
  })

  describe('generateUserIdFromLogin', () => {
    it('uM-13: returns same id as toDomain', () => {
      const fromLogin = generateUserIdFromLogin('octocat', TEST_CONFIG)
      const fromToDomain = toDomain(USER_FIXTURE, TEST_CONFIG).id

      expect(fromLogin).toBe(fromToDomain)
    })

    it('uM-14: valid UUID format', () => {
      const result = generateUserIdFromLogin('octocat', TEST_CONFIG)

      expect(result).toMatch(UUID_V5_REGEX)
    })
  })

  describe('edge cases', () => {
    it('eC-01: id scoped to owner/repo', () => {
      const configA = { ...TEST_CONFIG, owner: 'owner-a' }
      const configB = { ...TEST_CONFIG, owner: 'owner-b' }

      const alice: GitHubUserResponse = { ...USER_FIXTURE, login: 'alice' }

      const resultA = toDomain(alice, configA)
      const resultB = toDomain(alice, configB)

      expect(resultA.id).not.toBe(resultB.id)
    })
  })
})
