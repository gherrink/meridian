import { describe, expect, it } from 'vitest'

import {
  CreateIssueInputSchema,
  IssueFilterSchema,
  IssueSchema,
  UpdateIssueInputSchema,
} from '../../src/model/issue.js'
import {
  createIssueFixture,
  createTagFixture,
  TEST_PROJECT_ID,
  TEST_USER_ID,
} from '../helpers/fixtures.js'

describe('issueSchema', () => {
  it('validates a complete issue', () => {
    const input = createIssueFixture()

    const result = IssueSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Test Issue')
      expect(result.data.status).toBe('open')
      expect(result.data.priority).toBe('normal')
    }
  })

  it('validates an issue with all optional fields populated', () => {
    const tag = createTagFixture()
    const input = createIssueFixture({
      description: 'A detailed description',
      assigneeIds: [TEST_USER_ID],
      tags: [tag],
      dueDate: new Date('2025-12-31'),
      metadata: { source: 'github', issueNumber: 42 },
    })

    const result = IssueSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.assigneeIds).toHaveLength(1)
      expect(result.data.tags).toHaveLength(1)
      expect(result.data.dueDate).toEqual(new Date('2025-12-31'))
    }
  })

  it('applies default values for optional fields', () => {
    const input = {
      id: createIssueFixture().id,
      projectId: TEST_PROJECT_ID,
      title: 'Minimal Issue',
      status: 'open',
      priority: 'low',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = IssueSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('')
      expect(result.data.assigneeIds).toEqual([])
      expect(result.data.tags).toEqual([])
      expect(result.data.dueDate).toBeNull()
      expect(result.data.metadata).toEqual({})
    }
  })

  it('rejects an empty title', () => {
    const input = createIssueFixture({ title: '' })

    const result = IssueSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects a title exceeding 500 characters', () => {
    const input = createIssueFixture({ title: 'a'.repeat(501) })

    const result = IssueSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects an invalid status', () => {
    const input = { ...createIssueFixture(), status: 'pending' }

    const result = IssueSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects an invalid priority', () => {
    const input = { ...createIssueFixture(), priority: 'critical' }

    const result = IssueSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = IssueSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it('iS-01: accepts title at exactly 1 char', () => {
    // Arrange
    const input = createIssueFixture({ title: 'X' })

    // Act
    const result = IssueSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it('iS-02: accepts title at exactly 500 chars', () => {
    // Arrange
    const input = createIssueFixture({ title: 'a'.repeat(500) })

    // Act
    const result = IssueSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })
})

describe('createIssueInputSchema', () => {
  it('validates minimal input with only required fields', () => {
    const input = {
      projectId: TEST_PROJECT_ID,
      title: 'New Issue',
    }

    const result = CreateIssueInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('New Issue')
      expect(result.data.status).toBe('open')
      expect(result.data.priority).toBe('normal')
      expect(result.data.description).toBe('')
      expect(result.data.assigneeIds).toEqual([])
      expect(result.data.tags).toEqual([])
      expect(result.data.dueDate).toBeNull()
      expect(result.data.metadata).toEqual({})
    }
  })

  it('validates input with all fields provided', () => {
    const input = {
      projectId: TEST_PROJECT_ID,
      title: 'Full Issue',
      description: 'Detailed description',
      status: 'in_progress',
      priority: 'high',
      assigneeIds: [TEST_USER_ID],
      tags: [createTagFixture()],
      dueDate: new Date('2025-06-01'),
      metadata: { sprint: 5 },
    }

    const result = CreateIssueInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('in_progress')
      expect(result.data.priority).toBe('high')
    }
  })

  it('rejects empty title', () => {
    const input = {
      projectId: TEST_PROJECT_ID,
      title: '',
    }

    const result = CreateIssueInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects missing projectId', () => {
    const input = { title: 'No Project' }

    const result = CreateIssueInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('iS-06: rejects non-UUID projectId', () => {
    // Arrange
    const input = { projectId: 'abc', title: 'X' }

    // Act
    const result = CreateIssueInputSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  it('iS-07: rejects null input', () => {
    // Act
    const result = CreateIssueInputSchema.safeParse(null)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe('updateIssueInputSchema', () => {
  it('accepts an empty object since all fields are optional', () => {
    const result = UpdateIssueInputSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('validates a partial update with only title', () => {
    const input = { title: 'Updated Title' }

    const result = UpdateIssueInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Updated Title')
      expect(result.data.status).toBeUndefined()
    }
  })

  it('validates a partial update with status and priority', () => {
    const input = { status: 'closed', priority: 'urgent' }

    const result = UpdateIssueInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('closed')
      expect(result.data.priority).toBe('urgent')
    }
  })

  it('rejects an invalid status in update', () => {
    const input = { status: 'invalid' }

    const result = UpdateIssueInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('iS-08: rejects title exceeding 500', () => {
    // Arrange
    const input = { title: 'a'.repeat(501) }

    // Act
    const result = UpdateIssueInputSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe('issueFilterSchema', () => {
  it('applies default pagination values', () => {
    const result = IssueFilterSchema.safeParse({})

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
    }
  })

  it('validates a filter with all fields', () => {
    const input = {
      projectId: TEST_PROJECT_ID,
      status: 'open',
      priority: 'high',
      assigneeId: TEST_USER_ID,
      search: 'login bug',
      page: 2,
      limit: 50,
    }

    const result = IssueFilterSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('open')
      expect(result.data.page).toBe(2)
      expect(result.data.limit).toBe(50)
    }
  })

  it('coerces string page and limit to numbers', () => {
    const input = { page: '3', limit: '10' }

    const result = IssueFilterSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(3)
      expect(result.data.limit).toBe(10)
    }
  })

  it('rejects limit exceeding 100', () => {
    const input = { limit: 200 }

    const result = IssueFilterSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects non-positive page', () => {
    const input = { page: 0 }

    const result = IssueFilterSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('iS-03: rejects page=-1', () => {
    // Act
    const result = IssueFilterSchema.safeParse({ page: -1 })

    // Assert
    expect(result.success).toBe(false)
  })

  it('iS-04: accepts limit=100 (boundary)', () => {
    // Act
    const result = IssueFilterSchema.safeParse({ limit: 100 })

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(100)
    }
  })

  it('iS-05: rejects limit=0', () => {
    // Act
    const result = IssueFilterSchema.safeParse({ limit: 0 })

    // Assert
    expect(result.success).toBe(false)
  })
})
