import type { IssueId } from '../../src/model/value-objects.js'

import { describe, expect, it } from 'vitest'
import {
  CreateEpicInputSchema,
  EpicSchema,
  UpdateEpicInputSchema,
} from '../../src/model/epic.js'
import {
  createEpicFixture,
  TEST_ISSUE_ID,
  TEST_MILESTONE_ID,
} from '../helpers/fixtures.js'

describe('epicSchema', () => {
  it('validates a complete epic', () => {
    const input = createEpicFixture()

    const result = EpicSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Test Epic')
      expect(result.data.status).toBe('open')
    }
  })

  it('validates an epic with issue references', () => {
    const secondIssueId = '660e8400-e29b-41d4-a716-446655440001' as IssueId
    const input = createEpicFixture({
      issueIds: [TEST_ISSUE_ID, secondIssueId],
    })

    const result = EpicSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.issueIds).toHaveLength(2)
    }
  })

  it('applies default values for optional fields', () => {
    const input = {
      id: createEpicFixture().id,
      milestoneId: TEST_MILESTONE_ID,
      title: 'Minimal Epic',
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = EpicSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('')
      expect(result.data.issueIds).toEqual([])
      expect(result.data.metadata).toEqual({})
    }
  })

  it('rejects an empty title', () => {
    const input = createEpicFixture({ title: '' })

    const result = EpicSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects a title exceeding 500 characters', () => {
    const input = createEpicFixture({ title: 'a'.repeat(501) })

    const result = EpicSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects an invalid status', () => {
    const input = { ...createEpicFixture(), status: 'pending' }

    const result = EpicSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = EpicSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})

describe('createEpicInputSchema', () => {
  it('validates minimal input with only required fields', () => {
    const input = {
      milestoneId: TEST_MILESTONE_ID,
      title: 'New Epic',
    }

    const result = CreateEpicInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('New Epic')
      expect(result.data.status).toBe('open')
      expect(result.data.description).toBe('')
      expect(result.data.issueIds).toEqual([])
      expect(result.data.metadata).toEqual({})
    }
  })

  it('validates input with all fields provided', () => {
    const input = {
      milestoneId: TEST_MILESTONE_ID,
      title: 'Full Epic',
      description: 'Epic description',
      status: 'in_progress',
      issueIds: [TEST_ISSUE_ID],
      metadata: { quarter: 'Q1' },
    }

    const result = CreateEpicInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('in_progress')
      expect(result.data.issueIds).toHaveLength(1)
    }
  })

  it('rejects empty title', () => {
    const input = {
      milestoneId: TEST_MILESTONE_ID,
      title: '',
    }

    const result = CreateEpicInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })
})

describe('updateEpicInputSchema', () => {
  it('accepts an empty object since all fields are optional', () => {
    const result = UpdateEpicInputSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('validates a partial update with only title', () => {
    const input = { title: 'Updated Epic' }

    const result = UpdateEpicInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Updated Epic')
    }
  })

  it('validates a partial update with status', () => {
    const input = { status: 'closed' }

    const result = UpdateEpicInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('closed')
    }
  })

  it('rejects an invalid status in update', () => {
    const input = { status: 'invalid' }

    const result = UpdateEpicInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })
})
