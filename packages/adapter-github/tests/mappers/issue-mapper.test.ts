import type { ProjectId, TagId } from '@meridian/core'

import { describe, expect, it } from 'vitest'

import { extractIssueNumber, toCreateParams, toDomain, toUpdateParams } from '../../src/mappers/issue-mapper.js'
import {
  GITHUB_ISSUE_CLOSED,
  GITHUB_ISSUE_IN_PROGRESS,
  GITHUB_ISSUE_MINIMAL,
  GITHUB_ISSUE_OPEN,
  GITHUB_ISSUE_WITH_STRING_LABELS,
} from '../fixtures/github-responses.js'

const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440003' as ProjectId

const TEST_CONFIG = {
  owner: 'test-owner',
  repo: 'test-repo',
  projectId: TEST_PROJECT_ID,
}

describe('issueMapper', () => {
  describe('toDomain', () => {
    it('iM-01: maps open issue', () => {
      const result = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      expect(result.status).toBe('open')
      expect(result.priority).toBe('high')
      expect(result.title).toBe('Fix login button')
      expect(result.description).toBe('The login button does not respond on mobile devices')
      expect(result.projectId).toBe(TEST_PROJECT_ID)
    })

    it('iM-02: maps closed issue', () => {
      const result = toDomain(GITHUB_ISSUE_CLOSED, TEST_CONFIG)

      expect(result.status).toBe('closed')
      expect(result.priority).toBe('normal')
    })

    it('iM-03: maps in-progress issue', () => {
      const result = toDomain(GITHUB_ISSUE_IN_PROGRESS, TEST_CONFIG)

      expect(result.status).toBe('in_progress')
      expect(result.priority).toBe('urgent')
    })

    it('iM-04: maps minimal (null body)', () => {
      const result = toDomain(GITHUB_ISSUE_MINIMAL, TEST_CONFIG)

      expect(result.description).toBe('')
      expect(result.tags).toEqual([])
      expect(result.metadata.github_reactions).toBe(0)
    })

    it('iM-05: maps string labels', () => {
      const result = toDomain(GITHUB_ISSUE_WITH_STRING_LABELS, TEST_CONFIG)

      expect(result.priority).toBe('low')
      expect(result.tags.some(t => t.name === 'bug')).toBe(true)
    })

    it('iM-06: metadata has github_number', () => {
      const result = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      expect(result.metadata.github_number).toBe(42)
    })

    it('iM-07: metadata has github_url', () => {
      const result = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      expect(result.metadata.github_url).toBe(GITHUB_ISSUE_OPEN.html_url)
    })

    it('iM-08: metadata has github_locked', () => {
      const result = toDomain(GITHUB_ISSUE_IN_PROGRESS, TEST_CONFIG)

      expect(result.metadata.github_locked).toBe(true)
    })

    it('iM-09: deterministic id for same input', () => {
      const first = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      const second = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      expect(first.id).toBe(second.id)
    })

    it('iM-10: different id for different number', () => {
      const first = toDomain({ ...GITHUB_ISSUE_OPEN, number: 1 }, TEST_CONFIG)
      const second = toDomain({ ...GITHUB_ISSUE_OPEN, number: 2 }, TEST_CONFIG)

      expect(first.id).not.toBe(second.id)
    })
  })

  describe('toCreateParams', () => {
    it('iM-11: minimal create (title only)', () => {
      const result = toCreateParams(
        { projectId: TEST_PROJECT_ID, title: 'T', description: '', status: 'open', priority: 'normal', assigneeIds: [], tags: [], dueDate: null, metadata: {} },
        TEST_CONFIG,
      )

      expect(result.owner).toBe('test-owner')
      expect(result.repo).toBe('test-repo')
      expect(result.title).toBe('T')
      expect(result.body).toBeUndefined()
      expect(result.labels).toBeUndefined()
    })

    it('iM-12: with description', () => {
      const result = toCreateParams(
        { projectId: TEST_PROJECT_ID, title: 'T', description: 'D', status: 'open', priority: 'normal', assigneeIds: [], tags: [], dueDate: null, metadata: {} },
        TEST_CONFIG,
      )

      expect(result.body).toBe('D')
    })

    it('iM-13: with high priority', () => {
      const result = toCreateParams(
        { projectId: TEST_PROJECT_ID, title: 'T', description: '', status: 'open', priority: 'high', assigneeIds: [], tags: [], dueDate: null, metadata: {} },
        TEST_CONFIG,
      )

      expect(result.labels).toContain('priority:high')
    })

    it('iM-14: normal priority omits label', () => {
      const result = toCreateParams(
        { projectId: TEST_PROJECT_ID, title: 'T', description: '', status: 'open', priority: 'normal', assigneeIds: [], tags: [], dueDate: null, metadata: {} },
        TEST_CONFIG,
      )

      expect(result.labels === undefined || result.labels.length === 0).toBe(true)
    })

    it('iM-15: with in_progress status', () => {
      const result = toCreateParams(
        { projectId: TEST_PROJECT_ID, title: 'T', description: '', status: 'in_progress', priority: 'normal', assigneeIds: [], tags: [], dueDate: null, metadata: {} },
        TEST_CONFIG,
      )

      expect(result.labels).toContain('status:in-progress')
    })

    it('iM-16: with tags', () => {
      const result = toCreateParams(
        {
          projectId: TEST_PROJECT_ID,
          title: 'T',
          description: '',
          status: 'open',
          priority: 'normal',
          assigneeIds: [],
          tags: [{ id: '00000000-0000-5000-a000-000000000001' as TagId, name: 'bug', color: null }],
          dueDate: null,
          metadata: {},
        },
        TEST_CONFIG,
      )

      expect(result.labels).toContain('bug')
    })
  })

  describe('toUpdateParams', () => {
    it('iM-17: title only', () => {
      const result = toUpdateParams(
        { title: 'New' },
        42,
        TEST_CONFIG,
        [],
      )

      expect(result.title).toBe('New')
      expect(result.labels).toBeUndefined()
    })

    it('iM-18: status to closed', () => {
      const result = toUpdateParams(
        { status: 'closed' },
        42,
        TEST_CONFIG,
        [],
      )

      expect(result.state).toBe('closed')
    })

    it('iM-19: status to open', () => {
      const result = toUpdateParams(
        { status: 'open' },
        42,
        TEST_CONFIG,
        [],
      )

      expect(result.state).toBe('open')
    })

    it('iM-20: priority change preserves non-managed labels', () => {
      const currentLabels = [
        { name: 'bug' },
        { name: 'priority:low' },
      ]

      const result = toUpdateParams(
        { priority: 'high' },
        42,
        TEST_CONFIG,
        currentLabels,
      )

      expect(result.labels).toContain('bug')
      expect(result.labels).toContain('priority:high')
      expect(result.labels).not.toContain('priority:low')
    })

    it('iM-21: tags replacement drops old non-managed', () => {
      const currentLabels = [
        { name: 'bug' },
      ]

      const result = toUpdateParams(
        { tags: [{ id: '00000000-0000-5000-a000-000000000001' as TagId, name: 'feature', color: null }] },
        42,
        TEST_CONFIG,
        currentLabels,
      )

      expect(result.labels).toContain('feature')
      expect(result.labels).not.toContain('bug')
    })

    it('iM-22: undefined priority preserves existing', () => {
      const currentLabels = [
        { name: 'priority:high' },
      ]

      const result = toUpdateParams(
        { status: 'open' },
        42,
        TEST_CONFIG,
        currentLabels,
      )

      expect(result.labels).toContain('priority:high')
    })
  })

  describe('extractIssueNumber', () => {
    it('iM-23: extracts number from metadata', () => {
      const issue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      const result = extractIssueNumber(issue)

      expect(result).toBe(42)
    })

    it('iM-24: returns undefined without metadata', () => {
      const issue = {
        ...toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG),
        metadata: {},
      }

      const result = extractIssueNumber(issue)

      expect(result).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('eC-04: toDomain with null assignees', () => {
      const result = toDomain(GITHUB_ISSUE_MINIMAL, TEST_CONFIG)

      expect(result.assigneeIds).toEqual([])
    })

    it('eC-05: toDomain with null milestone', () => {
      const result = toDomain(GITHUB_ISSUE_MINIMAL, TEST_CONFIG)

      expect(result.metadata.github_milestone).toBeNull()
    })
  })
})
