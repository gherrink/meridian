import type { MilestoneId, TagId } from '@meridian/core'

import { describe, expect, it } from 'vitest'

import { extractIssueNumber, toCreateParams, toDomain, toUpdateParams } from '../../src/mappers/issue-mapper.js'
import {
  GITHUB_ISSUE_CLOSED,
  GITHUB_ISSUE_IN_PROGRESS,
  GITHUB_ISSUE_MINIMAL,
  GITHUB_ISSUE_OPEN,
  GITHUB_ISSUE_WITH_STRING_LABELS,
} from '../fixtures/github-responses.js'

const UUID_V5_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const TEST_MILESTONE_ID = '550e8400-e29b-41d4-a716-446655440003' as MilestoneId

const TEST_CONFIG = {
  owner: 'test-owner',
  repo: 'test-repo',
  milestoneId: TEST_MILESTONE_ID,
}

describe('issueMapper', () => {
  describe('toDomain', () => {
    it('iM-01: maps open issue', () => {
      const result = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      expect(result.state).toBe('open')
      expect(result.status).toBe('backlog')
      expect(result.priority).toBe('high')
      expect(result.title).toBe('Fix login button')
      expect(result.description).toBe('The login button does not respond on mobile devices')
      expect(result.milestoneId).toBe(TEST_MILESTONE_ID)
    })

    it('iM-02: maps closed issue', () => {
      const result = toDomain(GITHUB_ISSUE_CLOSED, TEST_CONFIG)

      expect(result.state).toBe('done')
      expect(result.priority).toBe('normal')
    })

    it('iM-03: maps in-progress issue', () => {
      const result = toDomain(GITHUB_ISSUE_IN_PROGRESS, TEST_CONFIG)

      expect(result.state).toBe('in_progress')
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

    it('iM-06: sets milestoneId from config', () => {
      const result = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      expect(result.milestoneId).toBe(TEST_CONFIG.milestoneId)
    })

    it('iM-07: milestoneId null when config omits it', () => {
      const configWithoutMilestone = { owner: 'test-owner', repo: 'test-repo' }

      const result = toDomain(GITHUB_ISSUE_OPEN, configWithoutMilestone)

      expect(result.milestoneId).toBeNull()
    })

    it('iM-08: deterministic id for same input', () => {
      const first = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      const second = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      expect(first.id).toBe(second.id)
    })

    it('iM-09: different id for different number', () => {
      const first = toDomain({ ...GITHUB_ISSUE_OPEN, number: 1 }, TEST_CONFIG)
      const second = toDomain({ ...GITHUB_ISSUE_OPEN, number: 2 }, TEST_CONFIG)

      expect(first.id).not.toBe(second.id)
    })

    it('iM-10: parentId is null when no parent comment', () => {
      const result = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      expect(result.parentId).toBeNull()
    })

    it('iM-11: parentId extracted from body comment', () => {
      const issueWithParent = {
        ...GITHUB_ISSUE_OPEN,
        body: 'Some description\n\n<!-- meridian:parent=test-owner/test-repo#10 -->',
      }
      const result = toDomain(issueWithParent, TEST_CONFIG)

      expect(result.parentId).toBeDefined()
      expect(result.parentId).not.toBeNull()
      expect(result.parentId).toMatch(UUID_V5_REGEX)
    })

    it('iM-12: metadata fields', () => {
      const result = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      expect(result.metadata.github_number).toBe(42)
      expect(result.metadata.github_url).toBe(GITHUB_ISSUE_OPEN.html_url)
      expect(result.metadata.github_reactions).toBe(5)
      expect(result.metadata.github_locked).toBe(false)
    })

    it('iM-13: dueDate always null', () => {
      const result = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      expect(result.dueDate).toBeNull()
    })

    it('iM-14: null assignees -> empty array', () => {
      const result = toDomain(GITHUB_ISSUE_MINIMAL, TEST_CONFIG)

      expect(result.assigneeIds).toEqual([])
    })

    it('iM-15: dates are Date objects', () => {
      const result = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('toCreateParams', () => {
    it('iM-16: minimal create (title only)', () => {
      const result = toCreateParams(
        { milestoneId: TEST_MILESTONE_ID, title: 'T', description: '', state: 'open', status: 'backlog', priority: 'normal', assigneeIds: [], tags: [], dueDate: null, metadata: {} },
        TEST_CONFIG,
      )

      expect(result.owner).toBe('test-owner')
      expect(result.repo).toBe('test-repo')
      expect(result.title).toBe('T')
      expect(result.body).toBeUndefined()
      expect(result.labels).toBeUndefined()
    })

    it('iM-17: with description', () => {
      const result = toCreateParams(
        { milestoneId: TEST_MILESTONE_ID, title: 'T', description: 'D', state: 'open', status: 'backlog', priority: 'normal', assigneeIds: [], tags: [], dueDate: null, metadata: {} },
        TEST_CONFIG,
      )

      expect(result.body).toBe('D')
    })

    it('iM-18: high priority adds label', () => {
      const result = toCreateParams(
        { milestoneId: TEST_MILESTONE_ID, title: 'T', description: '', state: 'open', status: 'backlog', priority: 'high', assigneeIds: [], tags: [], dueDate: null, metadata: {} },
        TEST_CONFIG,
      )

      expect(result.labels).toContain('priority:high')
    })

    it('iM-19: normal priority no label', () => {
      const result = toCreateParams(
        { milestoneId: TEST_MILESTONE_ID, title: 'T', description: '', state: 'open', status: 'backlog', priority: 'normal', assigneeIds: [], tags: [], dueDate: null, metadata: {} },
        TEST_CONFIG,
      )

      expect(result.labels === undefined || result.labels.length === 0).toBe(true)
    })

    it('iM-20: in_progress state', () => {
      const result = toCreateParams(
        { milestoneId: TEST_MILESTONE_ID, title: 'T', description: '', state: 'in_progress', status: 'backlog', priority: 'normal', assigneeIds: [], tags: [], dueDate: null, metadata: {} },
        TEST_CONFIG,
      )

      expect(result.labels).toContain('state:in-progress')
    })

    it('iM-21: non-backlog status', () => {
      const result = toCreateParams(
        { milestoneId: TEST_MILESTONE_ID, title: 'T', description: '', state: 'open', status: 'in-review', priority: 'normal', assigneeIds: [], tags: [], dueDate: null, metadata: {} },
        TEST_CONFIG,
      )

      expect(result.labels).toContain('status:in-review')
    })

    it('iM-22: with parent number', () => {
      const result = toCreateParams(
        { milestoneId: TEST_MILESTONE_ID, title: 'T', description: '', state: 'open', status: 'backlog', priority: 'normal', assigneeIds: [], tags: [], dueDate: null, metadata: {}, parentId: '00000000-0000-5000-a000-000000000099' as any },
        TEST_CONFIG,
        { parentGitHubNumber: 10 },
      )

      expect(result.body).toContain('<!-- meridian:parent=test-owner/test-repo#10 -->')
    })

    it('iM-23: with milestone number', () => {
      const result = toCreateParams(
        { milestoneId: TEST_MILESTONE_ID, title: 'T', description: '', state: 'open', status: 'backlog', priority: 'normal', assigneeIds: [], tags: [], dueDate: null, metadata: {} },
        TEST_CONFIG,
        { milestoneGitHubNumber: 5 },
      )

      expect(result.milestone).toBe(5)
    })
  })

  describe('toUpdateParams', () => {
    it('iM-24: title only', () => {
      const result = toUpdateParams(
        { title: 'New' },
        42,
        TEST_CONFIG,
        [],
      )

      expect(result.title).toBe('New')
      expect(result.labels).toBeUndefined()
    })

    it('iM-25: state done -> closed', () => {
      const result = toUpdateParams(
        { state: 'done' },
        42,
        TEST_CONFIG,
        [],
      )

      expect(result.state).toBe('closed')
    })

    it('iM-26: state open -> open', () => {
      const result = toUpdateParams(
        { state: 'open' },
        42,
        TEST_CONFIG,
        [],
      )

      expect(result.state).toBe('open')
    })

    it('iM-27: state in_progress -> open + label', () => {
      const result = toUpdateParams(
        { state: 'in_progress' },
        42,
        TEST_CONFIG,
        [],
      )

      expect(result.state).toBe('open')
      expect(result.labels).toContain('state:in-progress')
    })

    it('iM-28: priority change preserves tags', () => {
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

    it('iM-29: tags replacement drops old', () => {
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

    it('iM-30: undefined priority preserves existing', () => {
      const currentLabels = [
        { name: 'priority:high' },
      ]

      const result = toUpdateParams(
        { state: 'open' },
        42,
        TEST_CONFIG,
        currentLabels,
      )

      expect(result.labels).toContain('priority:high')
    })

    it('iM-31: undefined status preserves existing', () => {
      const currentLabels = [
        { name: 'status:in-review' },
      ]

      const result = toUpdateParams(
        { state: 'open' },
        42,
        TEST_CONFIG,
        currentLabels,
      )

      expect(result.labels).toContain('status:in-review')
    })
  })

  describe('extractIssueNumber', () => {
    it('iM-32: extracts number from metadata', () => {
      const issue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      const result = extractIssueNumber(issue)

      expect(result).toBe(42)
    })

    it('iM-33: returns undefined without metadata', () => {
      const issue = {
        ...toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG),
        metadata: {},
      }

      const result = extractIssueNumber(issue)

      expect(result).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('eC-03: parentId malformed repo slug', () => {
      const issueWithBadParent = {
        ...GITHUB_ISSUE_OPEN,
        body: '<!-- meridian:parent=badslug#10 -->',
      }

      const result = toDomain(issueWithBadParent, TEST_CONFIG)

      expect(result.parentId).toBeNull()
    })

    it('eC-04: toUpdateParams status change preserves existing state labels', () => {
      const currentLabels = [
        { name: 'state:in-progress' },
      ]

      const result = toUpdateParams(
        { status: 'done-review' },
        42,
        TEST_CONFIG,
        currentLabels,
      )

      expect(result.labels).toContain('state:in-progress')
      expect(result.labels).toContain('status:done-review')
    })

    it('eC-05: toCreateParams parent comment appended to existing description', () => {
      const result = toCreateParams(
        { milestoneId: TEST_MILESTONE_ID, title: 'T', description: 'Hello', state: 'open', status: 'backlog', priority: 'normal', assigneeIds: [], tags: [], dueDate: null, metadata: {}, parentId: '00000000-0000-5000-a000-000000000099' as any },
        TEST_CONFIG,
        { parentGitHubNumber: 10 },
      )

      expect(result.body).toBe('Hello\n\n<!-- meridian:parent=test-owner/test-repo#10 -->')
    })

    it('eC-06: toCreateParams parent comment as sole body', () => {
      const result = toCreateParams(
        { milestoneId: TEST_MILESTONE_ID, title: 'T', description: '', state: 'open', status: 'backlog', priority: 'normal', assigneeIds: [], tags: [], dueDate: null, metadata: {}, parentId: '00000000-0000-5000-a000-000000000099' as any },
        TEST_CONFIG,
        { parentGitHubNumber: 10 },
      )

      expect(result.body).toBe('<!-- meridian:parent=test-owner/test-repo#10 -->')
    })
  })
})
