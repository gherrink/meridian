import { describe, expect, it } from 'vitest'

import {
  CreateMilestoneInputSchema,
  MilestoneSchema,
  UpdateMilestoneInputSchema,
} from '../../src/model/milestone.js'
import { createMilestoneFixture, TEST_MILESTONE_ID } from '../helpers/fixtures.js'

describe('milestoneSchema', () => {
  it('validates a complete milestone', () => {
    const input = createMilestoneFixture()

    const result = MilestoneSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Test Milestone')
      expect(result.data.id).toBe(TEST_MILESTONE_ID)
    }
  })

  it('applies default values for optional fields', () => {
    const input = {
      id: TEST_MILESTONE_ID,
      name: 'Minimal Milestone',
      status: 'open',
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = MilestoneSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('')
      expect(result.data.metadata).toEqual({})
      expect(result.data.status).toBe('open')
      expect(result.data.dueDate).toBeNull()
    }
  })

  it('validates a milestone with metadata', () => {
    const input = createMilestoneFixture({
      metadata: { owner: 'team-alpha', repoUrl: 'https://github.com/org/repo' },
    })

    const result = MilestoneSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.metadata).toEqual({
        owner: 'team-alpha',
        repoUrl: 'https://github.com/org/repo',
      })
    }
  })

  it('rejects an empty name', () => {
    const input = createMilestoneFixture({ name: '' })

    const result = MilestoneSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects a name exceeding 200 characters', () => {
    const input = createMilestoneFixture({ name: 'a'.repeat(201) })

    const result = MilestoneSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = MilestoneSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})

describe('createMilestoneInputSchema', () => {
  it('validates minimal input with only name', () => {
    const input = { name: 'New Milestone' }

    const result = CreateMilestoneInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('New Milestone')
      expect(result.data.description).toBe('')
      expect(result.data.metadata).toEqual({})
      expect(result.data.status).toBe('open')
      expect(result.data.dueDate).toBeNull()
    }
  })

  it('validates input with all fields provided', () => {
    const input = {
      name: 'Full Milestone',
      description: 'A complete milestone',
      status: 'closed' as const,
      dueDate: new Date('2025-12-31'),
      metadata: { team: 'backend' },
    }

    const result = CreateMilestoneInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('A complete milestone')
      expect(result.data.status).toBe('closed')
      expect(result.data.dueDate).toEqual(new Date('2025-12-31'))
    }
  })

  it('rejects empty name', () => {
    const input = { name: '' }

    const result = CreateMilestoneInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('pR-01: accepts name at exactly 1 char', () => {
    // Act
    const result = CreateMilestoneInputSchema.safeParse({ name: 'X' })

    // Assert
    expect(result.success).toBe(true)
  })

  it('pR-02: accepts name at exactly 200 chars', () => {
    // Act
    const result = CreateMilestoneInputSchema.safeParse({ name: 'a'.repeat(200) })

    // Assert
    expect(result.success).toBe(true)
  })
})

describe('updateMilestoneInputSchema', () => {
  it('accepts an empty object since all fields are optional', () => {
    const result = UpdateMilestoneInputSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('validates a partial update with only name', () => {
    const input = { name: 'Updated Name' }

    const result = UpdateMilestoneInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Updated Name')
    }
  })

  it('validates a partial update with description and metadata', () => {
    const input = {
      description: 'Updated description',
      metadata: { archived: true },
    }

    const result = UpdateMilestoneInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('Updated description')
    }
  })

  it('rejects an invalid name in update', () => {
    const input = { name: '' }

    const result = UpdateMilestoneInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('pR-03: rejects name exceeding 200', () => {
    // Arrange
    const input = { name: 'a'.repeat(201) }

    // Act
    const result = UpdateMilestoneInputSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})
