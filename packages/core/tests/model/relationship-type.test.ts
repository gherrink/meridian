import { describe, expect, it } from 'vitest'

import {
  DEFAULT_RELATIONSHIP_TYPES,
  RelationshipTypeSchema,
} from '../../src/model/relationship-type.js'

describe('relationshipTypeSchema', () => {
  it('rT-01: validates complete relationship type', () => {
    // Arrange
    const input = {
      name: 'blocks',
      forwardLabel: 'blocks',
      inverseLabel: 'is blocked by',
      symmetric: false,
    }

    // Act
    const result = RelationshipTypeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('blocks')
      expect(result.data.forwardLabel).toBe('blocks')
      expect(result.data.inverseLabel).toBe('is blocked by')
      expect(result.data.symmetric).toBe(false)
    }
  })

  it('rT-02: rejects empty name', () => {
    // Arrange
    const input = {
      name: '',
      forwardLabel: 'blocks',
      inverseLabel: 'is blocked by',
      symmetric: false,
    }

    // Act
    const result = RelationshipTypeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  it('rT-03: rejects empty forwardLabel', () => {
    // Arrange
    const input = {
      name: 'blocks',
      forwardLabel: '',
      inverseLabel: 'is blocked by',
      symmetric: false,
    }

    // Act
    const result = RelationshipTypeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  it('rT-04: rejects empty inverseLabel', () => {
    // Arrange
    const input = {
      name: 'blocks',
      forwardLabel: 'blocks',
      inverseLabel: '',
      symmetric: false,
    }

    // Act
    const result = RelationshipTypeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  it('rT-05: rejects missing symmetric field', () => {
    // Arrange
    const input = {
      name: 'blocks',
      forwardLabel: 'blocks',
      inverseLabel: 'is blocked by',
    }

    // Act
    const result = RelationshipTypeSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })

  it('rT-06: DEFAULT_RELATIONSHIP_TYPES has 3 entries', () => {
    // Assert
    expect(DEFAULT_RELATIONSHIP_TYPES).toHaveLength(3)
  })

  it('rT-07: default set contains blocks (directed)', () => {
    // Arrange
    const blocks = DEFAULT_RELATIONSHIP_TYPES.find(rt => rt.name === 'blocks')

    // Assert
    expect(blocks).toBeDefined()
    expect(blocks!.symmetric).toBe(false)
    expect(blocks!.forwardLabel).toBe('blocks')
    expect(blocks!.inverseLabel).toBe('is blocked by')
  })

  it('rT-08: default set contains duplicates (directed)', () => {
    // Arrange
    const duplicates = DEFAULT_RELATIONSHIP_TYPES.find(rt => rt.name === 'duplicates')

    // Assert
    expect(duplicates).toBeDefined()
    expect(duplicates!.symmetric).toBe(false)
    expect(duplicates!.forwardLabel).toBe('duplicates')
    expect(duplicates!.inverseLabel).toBe('is duplicated by')
  })

  it('rT-09: default set contains relates-to (symmetric)', () => {
    // Arrange
    const relatesTo = DEFAULT_RELATIONSHIP_TYPES.find(rt => rt.name === 'relates-to')

    // Assert
    expect(relatesTo).toBeDefined()
    expect(relatesTo!.symmetric).toBe(true)
    expect(relatesTo!.forwardLabel).toBe('relates to')
    expect(relatesTo!.inverseLabel).toBe('relates to')
  })
})
