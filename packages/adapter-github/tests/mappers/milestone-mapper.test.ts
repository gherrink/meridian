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
    it('mM-01: maps title to name', () => {
      const milestone = { ...MILESTONE_FIXTURE, title: 'v1.0' }

      const result = toDomain(milestone, TEST_CONFIG)

      expect(result.name).toBe('v1.0')
    })

    it('mM-02: status from github state open', () => {
      const result = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(result.status).toBe('open')
    })

    it('mM-03: status from github state closed', () => {
      const closedMilestone: GitHubMilestoneResponse = { ...MILESTONE_FIXTURE, state: 'closed' }

      const result = toDomain(closedMilestone, TEST_CONFIG)

      expect(result.status).toBe('closed')
    })

    it('mM-04: dueDate null when due_on absent', () => {
      const result = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(result.dueDate).toBeNull()
    })

    it('mM-05: dueDate parsed when due_on present', () => {
      const milestoneWithDue: GitHubMilestoneResponse = {
        ...MILESTONE_FIXTURE,
        due_on: '2025-06-01T00:00:00Z',
      } as GitHubMilestoneResponse & { due_on: string }

      const result = toDomain(milestoneWithDue, TEST_CONFIG)

      expect(result.dueDate).toBeInstanceOf(Date)
      expect(result.dueDate!.toISOString()).toBe('2025-06-01T00:00:00.000Z')
    })

    it('mM-06: dueDate null for invalid date', () => {
      const milestoneWithBadDue: GitHubMilestoneResponse = {
        ...MILESTONE_FIXTURE,
        due_on: 'invalid',
      } as GitHubMilestoneResponse & { due_on: string }

      const result = toDomain(milestoneWithBadDue, TEST_CONFIG)

      expect(result.dueDate).toBeNull()
    })

    it('mM-07: null description -> empty string', () => {
      const milestoneNullDesc: GitHubMilestoneResponse = { ...MILESTONE_FIXTURE, description: null }

      const result = toDomain(milestoneNullDesc, TEST_CONFIG)

      expect(result.description).toBe('')
    })

    it('mM-08: deterministic id', () => {
      const first = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)
      const second = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(first.id).toBe(second.id)
    })

    it('mM-09: metadata fields', () => {
      const result = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(result.metadata.github_milestone_number).toBe(3)
      expect(result.metadata.github_url).toBe('https://github.com/test-owner/test-repo/milestone/3')
      expect(result.metadata.github_state).toBe('open')
      expect(result.metadata.github_open_issues).toBe(5)
      expect(result.metadata.github_closed_issues).toBe(10)
    })

    it('mM-10: maps createdAt as Date', () => {
      const result = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.createdAt.toISOString()).toBe('2025-01-01T00:00:00.000Z')
    })

    it('mM-11: maps updatedAt as Date', () => {
      const result = toDomain(MILESTONE_FIXTURE, TEST_CONFIG)

      expect(result.updatedAt).toBeInstanceOf(Date)
      expect(result.updatedAt.toISOString()).toBe('2025-02-01T00:00:00.000Z')
    })
  })

  describe('toCreateParams', () => {
    it('mM-10: maps name to title', () => {
      const input = { name: 'Sprint 1', description: '', metadata: {} }

      const result = toCreateParams(input, TEST_CONFIG)

      expect(result.title).toBe('Sprint 1')
    })

    it('mM-11: omits description when empty', () => {
      const input = { name: 'Sprint 1', description: '', metadata: {} }

      const result = toCreateParams(input, TEST_CONFIG)

      expect(result.description).toBeUndefined()
    })

    it('mM-12: includes dueDate as ISO string', () => {
      const dueDate = new Date('2025-06-01T00:00:00Z')
      const input = { name: 'Sprint 1', description: '', metadata: {}, dueDate }

      const result = toCreateParams(input, TEST_CONFIG)

      expect(result.due_on).toBe(dueDate.toISOString())
    })
  })

  describe('toUpdateParams', () => {
    it('mM-13: maps status to state', () => {
      const result = toUpdateParams({ status: 'closed' }, 3, TEST_CONFIG)

      expect(result.state).toBe('closed')
    })

    it('mM-14: maps dueDate null to null', () => {
      const result = toUpdateParams({ dueDate: null }, 3, TEST_CONFIG)

      expect(result.due_on).toBeNull()
    })

    it('mM-15: omits undefined fields', () => {
      const result = toUpdateParams({ name: 'New Name' }, 3, TEST_CONFIG)

      expect(result.title).toBe('New Name')
      expect(result.description).toBeUndefined()
      expect(result.state).toBeUndefined()
      expect(result.due_on).toBeUndefined()
    })
  })
})
