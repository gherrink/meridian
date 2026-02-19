import type { MilestoneId } from '@meridian/core'

import type { GitHubMilestoneResponse } from '../../src/mappers/github-types.js'

import { describe, expect, it } from 'vitest'

import { toCreateParams, toDomain, toUpdateParams } from '../../src/mappers/issue-mapper.js'
import { extractState, extractStatus, extractTags, toStatusLabels } from '../../src/mappers/label-mapper.js'
import {
  toCreateParams as milestoneToCreateParams,
  toDomain as milestoneToDomain,
  toUpdateParams as milestoneToUpdateParams,
} from '../../src/mappers/milestone-mapper.js'
import { GITHUB_ISSUE_CLOSED, GITHUB_ISSUE_OPEN } from '../fixtures/github-responses.js'

const TEST_MILESTONE_ID = '550e8400-e29b-41d4-a716-446655440003' as MilestoneId

const TEST_CONFIG = {
  owner: 'o',
  repo: 'r',
  milestoneId: TEST_MILESTONE_ID,
}

const MILESTONE_FIXTURE: GitHubMilestoneResponse = {
  id: 200,
  number: 3,
  title: 'v1.0',
  description: 'First release',
  state: 'open',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-02-01T00:00:00Z',
  html_url: 'https://github.com/o/r/milestone/3',
  open_issues: 5,
  closed_issues: 10,
}

// ---------------------------------------------------------------------------
// GitHub Label Mapper
// ---------------------------------------------------------------------------
describe('post-migration: label mapper', () => {
  it('lM-01: extractState returns done when githubState=closed', () => {
    expect(extractState('closed', [])).toBe('done')
  })

  it('lM-02: extractState returns in_progress for label state:in-progress', () => {
    expect(extractState('open', [{ name: 'state:in-progress' }])).toBe('in_progress')
  })

  it('lM-03: extractState returns in_progress for label state:in_progress', () => {
    expect(extractState('open', [{ name: 'state:in_progress' }])).toBe('in_progress')
  })

  it('lM-04: extractState returns open when no state labels', () => {
    expect(extractState('open', [])).toBe('open')
  })

  it('lM-05: extractState closed overrides labels', () => {
    expect(extractState('closed', [{ name: 'state:in-progress' }])).toBe('done')
  })

  it('lM-06: extractStatus returns backlog when no status labels', () => {
    expect(extractStatus([])).toBe('backlog')
  })

  it('lM-07: extractStatus returns status from label', () => {
    expect(extractStatus([{ name: 'status:in-review' }])).toBe('in-review')
  })

  it('lM-08: toStatusLabels for non-backlog status', () => {
    expect(toStatusLabels('in-review')).toEqual(['status:in-review'])
  })

  it('lM-09: extractTags excludes state: status: and priority: prefixed labels', () => {
    const labels = [
      { id: 1, name: 'bug' },
      { id: 2, name: 'state:in-progress' },
      { id: 3, name: 'status:in-review' },
      { id: 4, name: 'priority:high' },
    ]
    const result = extractTags(labels)
    expect(result).toHaveLength(1)
    expect(result[0]!.name).toBe('bug')
  })
})

// ---------------------------------------------------------------------------
// GitHub Issue Mapper
// ---------------------------------------------------------------------------
describe('post-migration: issue mapper', () => {
  it('iM-01: toDomain sets milestoneId from config (nullable)', () => {
    const result = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
    expect(result.milestoneId).toBe(TEST_CONFIG.milestoneId)
  })

  it('iM-02: toDomain maps state from extractState', () => {
    const result = toDomain(GITHUB_ISSUE_CLOSED, TEST_CONFIG)
    expect(result.state).toBe('done')
  })

  it('iM-03: toDomain has parentId field (nullable)', () => {
    const result = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
    expect('parentId' in result).toBe(true)
    expect(result.parentId).toBeNull()
  })

  it('iM-04: toDomain has both state and status fields', () => {
    const result = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
    expect(result.state).toBe('open')
    expect(result.status).toBe('backlog')
  })

  it('iM-05: toCreateParams adds state:in-progress label for in_progress state', () => {
    const result = toCreateParams(
      {
        milestoneId: TEST_MILESTONE_ID,
        title: 'T',
        description: '',
        state: 'in_progress',
        status: 'backlog',
        priority: 'normal',
        assigneeIds: [],
        tags: [],
        dueDate: null,
        metadata: {},
      },
      TEST_CONFIG,
    )
    expect(result.labels).toContain('state:in-progress')
  })

  it('iM-06: toUpdateParams maps state=done to github state=closed', () => {
    const result = toUpdateParams({ state: 'done' }, 42, TEST_CONFIG, [])
    expect(result.state).toBe('closed')
  })

  it('iM-07: toUpdateParams maps state=open to github state=open', () => {
    const result = toUpdateParams({ state: 'open' }, 42, TEST_CONFIG, [])
    expect(result.state).toBe('open')
  })

  it('iM-08: toUpdateParams maps state=in_progress to github state=open', () => {
    const result = toUpdateParams({ state: 'in_progress' }, 42, TEST_CONFIG, [])
    expect(result.state).toBe('open')
  })
})

// ---------------------------------------------------------------------------
// GitHub Milestone Mapper
// ---------------------------------------------------------------------------
describe('post-migration: milestone mapper', () => {
  it('mM-01: toDomain maps name from title', () => {
    const result = milestoneToDomain(MILESTONE_FIXTURE, TEST_CONFIG)
    expect(result.name).toBe('v1.0')
  })

  it('mM-02: toDomain has status field mapped from github state', () => {
    const result = milestoneToDomain(MILESTONE_FIXTURE, TEST_CONFIG)
    expect(result.status).toBe('open')
  })

  it('mM-03: toDomain has dueDate field (nullable)', () => {
    const result = milestoneToDomain(MILESTONE_FIXTURE, TEST_CONFIG)
    expect('dueDate' in result).toBe(true)
    expect(result.dueDate).toBeNull()
  })

  it('mM-04: toCreateParams maps name to title', () => {
    const result = milestoneToCreateParams(
      { name: 'Sprint', description: '', metadata: {} },
      TEST_CONFIG,
    )
    expect(result.title).toBe('Sprint')
  })

  it('mM-05: toUpdateParams maps name to title', () => {
    const result = milestoneToUpdateParams({ name: 'NewName' }, 3, TEST_CONFIG)
    expect(result.title).toBe('NewName')
  })
})

// ---------------------------------------------------------------------------
// Edge Case: EC-01
// ---------------------------------------------------------------------------
describe('post-migration: adapter edge cases', () => {
  it('eC-01: GitHubRepoConfig milestoneId is used by toDomain', () => {
    const result = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
    expect(result.milestoneId).toBe(TEST_MILESTONE_ID)
  })
})
