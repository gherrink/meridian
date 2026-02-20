import type { IssueId, IssueLinkId } from '../../src/model/value-objects.js'

import { describe, expect, it } from 'vitest'

import {
  CreateIssueLinkInputSchema,
  IssueLinkFilterSchema,
  IssueLinkSchema,
  ResolvedIssueLinkSchema,
} from '../../src/model/issue-link.js'

const TEST_ISSUE_LINK_ID = '550e8400-e29b-41d4-a716-446655440010' as IssueLinkId
const TEST_ISSUE_ID = '550e8400-e29b-41d4-a716-446655440001' as IssueId
const TEST_ISSUE_ID_2 = '550e8400-e29b-41d4-a716-446655440002' as IssueId

function createIssueLinkFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_ISSUE_LINK_ID,
    sourceIssueId: TEST_ISSUE_ID,
    targetIssueId: TEST_ISSUE_ID_2,
    type: 'blocks',
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }
}

describe('issueLinkSchema', () => {
  it('iL-01: validates complete IssueLink', () => {
    // Arrange
    const input = createIssueLinkFixture()

    // Act
    const result = IssueLinkSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it('iL-02: rejects non-UUID id', () => {
    // Arrange
    const input = createIssueLinkFixture({ id: 'abc' })

    // Act
    const result = IssueLinkSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  it('iL-03: rejects non-UUID sourceIssueId', () => {
    // Arrange
    const input = createIssueLinkFixture({ sourceIssueId: 'bad' })

    // Act
    const result = IssueLinkSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  it('iL-04: rejects non-UUID targetIssueId', () => {
    // Arrange
    const input = createIssueLinkFixture({ targetIssueId: 'bad' })

    // Act
    const result = IssueLinkSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  it('iL-05: rejects empty type', () => {
    // Arrange
    const input = createIssueLinkFixture({ type: '' })

    // Act
    const result = IssueLinkSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  it('iL-06: rejects missing createdAt', () => {
    // Arrange
    const { createdAt: _, ...input } = createIssueLinkFixture()

    // Act
    const result = IssueLinkSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  it('eC-01: schema rejects non-object input', () => {
    // Act
    const result = IssueLinkSchema.safeParse('string')

    // Assert
    expect(result.success).toBe(false)
  })
})

describe('createIssueLinkInputSchema', () => {
  it('iL-07: accepts valid input', () => {
    // Arrange
    const input = {
      sourceIssueId: TEST_ISSUE_ID,
      targetIssueId: TEST_ISSUE_ID_2,
      type: 'blocks',
    }

    // Act
    const result = CreateIssueLinkInputSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it('iL-08: rejects missing type', () => {
    // Arrange
    const input = {
      sourceIssueId: TEST_ISSUE_ID,
      targetIssueId: TEST_ISSUE_ID_2,
    }

    // Act
    const result = CreateIssueLinkInputSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  it('iL-09: rejects empty object', () => {
    // Act
    const result = CreateIssueLinkInputSchema.safeParse({})

    // Assert
    expect(result.success).toBe(false)
  })

  it('eC-02: schema rejects null input', () => {
    // Act
    const result = CreateIssueLinkInputSchema.safeParse(null)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe('issueLinkFilterSchema', () => {
  it('iL-10: accepts empty object', () => {
    // Act
    const result = IssueLinkFilterSchema.safeParse({})

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.issueId).toBeUndefined()
      expect(result.data.type).toBeUndefined()
    }
  })

  it('iL-11: accepts issueId + type', () => {
    // Arrange
    const input = { issueId: TEST_ISSUE_ID, type: 'blocks' }

    // Act
    const result = IssueLinkFilterSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it('iL-12: rejects non-UUID issueId', () => {
    // Arrange
    const input = { issueId: 'bad' }

    // Act
    const result = IssueLinkFilterSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe('resolvedIssueLinkSchema', () => {
  it('iL-13: validates outgoing link', () => {
    // Arrange
    const input = {
      id: TEST_ISSUE_LINK_ID,
      direction: 'outgoing',
      label: 'blocks',
      linkedIssueId: TEST_ISSUE_ID_2,
      type: 'blocks',
      createdAt: new Date('2025-01-01'),
    }

    // Act
    const result = ResolvedIssueLinkSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it('iL-14: validates incoming link', () => {
    // Arrange
    const input = {
      id: TEST_ISSUE_LINK_ID,
      direction: 'incoming',
      label: 'is blocked by',
      linkedIssueId: TEST_ISSUE_ID,
      type: 'blocks',
      createdAt: new Date('2025-01-01'),
    }

    // Act
    const result = ResolvedIssueLinkSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it('iL-15: rejects invalid direction', () => {
    // Arrange
    const input = {
      id: TEST_ISSUE_LINK_ID,
      direction: 'both',
      label: 'blocks',
      linkedIssueId: TEST_ISSUE_ID_2,
      type: 'blocks',
      createdAt: new Date('2025-01-01'),
    }

    // Act
    const result = ResolvedIssueLinkSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})
