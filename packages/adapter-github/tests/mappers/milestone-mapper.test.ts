import type { MilestoneId } from '@meridian/core'

import type { GitHubMilestoneResponse } from '../../src/mappers/github-types.js'

import { describe, expect, it } from 'vitest'

import { toCreateParams, toDomain, toUpdateParams } from '../../src/mappers/milestone-mapper.js'

const TEST_MILESTONE_ID = '550e8400-e29b-41d4-a716-446655440003' as MilestoneId

const TEST_CONFIG = {
  owner: 'test-owner',
  repo: 'test-repo',
  milestoneId: TEST_MILESTONE_ID,
}

const MILESTONE_FIXTURE: GitHubMilestoneResponse = {
  id: 200,
  number: 3,
  title: 'v1.0 Release',
  description: 'First stable release',
  state: 'open',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-02-01T00:00:00Z',
  html_url: 'https://github.com/test-owner/test-repo/milestone/3',
  open_issues: 5,
  closed_issues: 10,
}

describe('milestoneMapper', () => {
  describe('toDomain', () => {
    it('pM-01: maps title to name', () => {
      const result = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(result.name).toBe('v1.0 Release')
    })

    it('pM-02: maps description', () => {
      const result = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(result.description).toBe('First stable release')
    })

    it('pM-03: null description defaults to empty string', () => {
      const milestoneNullDesc: GitHubMilestoneResponse = { ...MILESTONE_FIXTURE, description: null }

      const result = toDomain(milestoneNullDesc, TEST_CONFIG)

      expect(result.description).toBe('')
    })

    it('pM-04: id is deterministic UUID', () => {
      const first = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)
      const second = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(first.id).toBe(second.id)
    })

    it('pM-05: id differs for different milestone number', () => {
      const milestone4: GitHubMilestoneResponse = { ...MILESTONE_FIXTURE, number: 4 }

      const result3 = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)
      const result4 = toDomain(milestone4, TEST_CONFIG)

      expect(result3.id).not.toBe(result4.id)
    })

    it('pM-06: metadata contains github_milestone_number', () => {
      const result = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(result.metadata.github_milestone_number).toBe(3)
    })

    it('pM-07: metadata contains github_url', () => {
      const result = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(result.metadata.github_url).toBe('https://github.com/test-owner/test-repo/milestone/3')
    })

    it('pM-08: metadata contains github_state', () => {
      const result = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(result.metadata.github_state).toBe('open')
    })

    it('pM-09: metadata contains issue counts', () => {
      const result = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(result.metadata.github_open_issues).toBe(5)
      expect(result.metadata.github_closed_issues).toBe(10)
    })

    it('pM-10: maps createdAt as Date', () => {
      const result = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.createdAt.toISOString()).toBe('2025-01-01T00:00:00.000Z')
    })

    it('pM-11: maps updatedAt as Date', () => {
      const result = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(result.updatedAt).toBeInstanceOf(Date)
      expect(result.updatedAt.toISOString()).toBe('2025-02-01T00:00:00.000Z')
    })
  })

  describe('toCreateParams', () => {
    it('pM-12: maps name to title', () => {
      const input = { name: 'Sprint 1', description: '', metadata: {} }

      const result = toCreateParams(input, TEST_CONFIG)

      expect(result.title).toBe('Sprint 1')
    })

    it('pM-13: maps description when provided', () => {
      const input = { name: 'Sprint 1', description: 'Sprint desc', metadata: {} }

      const result = toCreateParams(input, TEST_CONFIG)

      expect(result.description).toBe('Sprint desc')
    })

    it('pM-14: omits description when empty/missing', () => {
      const input = { name: 'Sprint 1', description: '', metadata: {} }

      const result = toCreateParams(input, TEST_CONFIG)

      expect(result.description).toBeUndefined()
    })

    it('pM-15: includes owner and repo', () => {
      const input = { name: 'Sprint 1', description: '', metadata: {} }

      const result = toCreateParams(input, TEST_CONFIG)

      expect(result.owner).toBe('test-owner')
      expect(result.repo).toBe('test-repo')
    })
  })

  describe('toUpdateParams', () => {
    it('pM-16: maps milestone_number', () => {
      const result = toUpdateParams({ name: 'New Name' }, 3, TEST_CONFIG)

      expect(result.milestone_number).toBe(3)
    })

    it('pM-17: maps name to title when provided', () => {
      const result = toUpdateParams({ name: 'New Name' }, 3, TEST_CONFIG)

      expect(result.title).toBe('New Name')
    })

    it('pM-18: omits title when name undefined', () => {
      const result = toUpdateParams({ description: 'desc' }, 3, TEST_CONFIG)

      expect(result.title).toBeUndefined()
    })

    it('pM-19: maps description when provided', () => {
      const result = toUpdateParams({ description: 'Updated' }, 3, TEST_CONFIG)

      expect(result.description).toBe('Updated')
    })

    it('pM-20: omits description when undefined', () => {
      const result = toUpdateParams({ name: 'N' }, 3, TEST_CONFIG)

      expect(result.description).toBeUndefined()
    })

    it('pM-21: includes owner and repo', () => {
      const result = toUpdateParams({ name: 'N' }, 3, TEST_CONFIG)

      expect(result.owner).toBe('test-owner')
      expect(result.repo).toBe('test-repo')
    })
  })

  describe('edge cases', () => {
    it('eC-03: milestone with all null optional fields', () => {
      const milestoneNullFields: GitHubMilestoneResponse = { ...MILESTONE_FIXTURE, description: null }

      const result = toDomain(milestoneNullFields, TEST_CONFIG)

      expect(result.description).toBe('')
      expect(result.metadata.github_milestone_number).toBe(3)
      expect(result.metadata.github_url).toBeDefined()
      expect(result.metadata.github_state).toBeDefined()
      expect(result.metadata.github_open_issues).toBeDefined()
      expect(result.metadata.github_closed_issues).toBeDefined()
    })
  })
})
