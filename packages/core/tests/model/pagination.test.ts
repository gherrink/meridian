import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { createPaginatedResultSchema, PaginationParamsSchema } from '../../src/model/pagination.js'

describe('paginationParamsSchema', () => {
  it('applies default values when no input is provided', () => {
    const result = PaginationParamsSchema.safeParse({})

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
    }
  })

  it('accepts valid page and limit', () => {
    const input = { page: 5, limit: 50 }

    const result = PaginationParamsSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(5)
      expect(result.data.limit).toBe(50)
    }
  })

  it('coerces string values to numbers', () => {
    const input = { page: '3', limit: '25' }

    const result = PaginationParamsSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(3)
      expect(result.data.limit).toBe(25)
    }
  })

  it('rejects limit exceeding 100', () => {
    const input = { page: 1, limit: 101 }

    const result = PaginationParamsSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects non-positive page', () => {
    const input = { page: 0 }

    const result = PaginationParamsSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects negative limit', () => {
    const input = { limit: -1 }

    const result = PaginationParamsSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('pG-01: accepts limit=1 (minimum positive)', () => {
    // Act
    const result = PaginationParamsSchema.safeParse({ limit: 1 })

    // Assert
    expect(result.success).toBe(true)
  })

  it('pG-02: accepts limit=100 (maximum)', () => {
    // Act
    const result = PaginationParamsSchema.safeParse({ limit: 100 })

    // Assert
    expect(result.success).toBe(true)
  })

  it('pG-03: rejects fractional page', () => {
    // Act
    const result = PaginationParamsSchema.safeParse({ page: 1.5 })

    // Assert
    expect(result.success).toBe(false)
  })

  it('pG-04: rejects fractional limit', () => {
    // Act
    const result = PaginationParamsSchema.safeParse({ limit: 2.5 })

    // Assert
    expect(result.success).toBe(false)
  })
})

describe('createPaginatedResultSchema', () => {
  const StringResultSchema = createPaginatedResultSchema(z.string())

  it('validates a paginated result with items', () => {
    const input = {
      items: ['item1', 'item2'],
      total: 10,
      page: 1,
      limit: 20,
      hasMore: false,
    }

    const result = StringResultSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toEqual(['item1', 'item2'])
      expect(result.data.total).toBe(10)
      expect(result.data.hasMore).toBe(false)
    }
  })

  it('validates a paginated result with empty items', () => {
    const input = {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
    }

    const result = StringResultSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toEqual([])
      expect(result.data.total).toBe(0)
    }
  })

  it('rejects missing required fields', () => {
    const result = StringResultSchema.safeParse({ items: [] })

    expect(result.success).toBe(false)
  })

  it('rejects negative total', () => {
    const input = {
      items: [],
      total: -1,
      page: 1,
      limit: 20,
      hasMore: false,
    }

    const result = StringResultSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('works with a complex item schema', () => {
    const ItemSchema = z.object({ id: z.string(), value: z.number() })
    const ComplexResultSchema = createPaginatedResultSchema(ItemSchema)

    const input = {
      items: [{ id: 'a', value: 1 }],
      total: 1,
      page: 1,
      limit: 10,
      hasMore: false,
    }

    const result = ComplexResultSchema.safeParse(input)

    expect(result.success).toBe(true)
  })
})
