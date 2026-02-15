import { describe, expect, it } from 'vitest'

import { CreateTagInputSchema, TagSchema } from '../../src/model/tag.js'
import { TEST_TAG_ID } from '../helpers/fixtures.js'

describe('tagSchema', () => {
  it('validates a complete tag', () => {
    const input = {
      id: TEST_TAG_ID,
      name: 'bug',
      color: '#ff0000',
    }

    const result = TagSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('bug')
      expect(result.data.color).toBe('#ff0000')
    }
  })

  it('applies default null for color when omitted', () => {
    const input = {
      id: TEST_TAG_ID,
      name: 'feature',
    }

    const result = TagSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.color).toBeNull()
    }
  })

  it('accepts null for color explicitly', () => {
    const input = {
      id: TEST_TAG_ID,
      name: 'feature',
      color: null,
    }

    const result = TagSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.color).toBeNull()
    }
  })

  it('rejects an empty name', () => {
    const input = {
      id: TEST_TAG_ID,
      name: '',
    }

    const result = TagSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects a name exceeding 100 characters', () => {
    const input = {
      id: TEST_TAG_ID,
      name: 'a'.repeat(101),
    }

    const result = TagSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects an invalid color format', () => {
    const input = {
      id: TEST_TAG_ID,
      name: 'bug',
      color: 'red',
    }

    const result = TagSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects a color with wrong hex length', () => {
    const input = {
      id: TEST_TAG_ID,
      name: 'bug',
      color: '#fff',
    }

    const result = TagSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('tG-01: accepts uppercase hex color', () => {
    // Arrange
    const input = { id: TEST_TAG_ID, name: 'x', color: '#FF00AA' }

    // Act
    const result = TagSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it('tG-02: accepts name at exactly 1 char', () => {
    // Arrange
    const input = { id: TEST_TAG_ID, name: 'x' }

    // Act
    const result = TagSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it('tG-03: accepts name at exactly 100 chars', () => {
    // Arrange
    const input = { id: TEST_TAG_ID, name: 'a'.repeat(100) }

    // Act
    const result = TagSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  it('tG-04: rejects color with hash only', () => {
    // Arrange
    const input = { id: TEST_TAG_ID, name: 'x', color: '#' }

    // Act
    const result = TagSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe('createTagInputSchema', () => {
  it('validates input with name and color', () => {
    const input = {
      name: 'enhancement',
      color: '#00ff00',
    }

    const result = CreateTagInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('enhancement')
      expect(result.data.color).toBe('#00ff00')
    }
  })

  it('applies default null for color when omitted', () => {
    const input = { name: 'docs' }

    const result = CreateTagInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.color).toBeNull()
    }
  })

  it('does not require an id', () => {
    const input = { name: 'docs' }

    const result = CreateTagInputSchema.safeParse(input)

    expect(result.success).toBe(true)
  })
})
