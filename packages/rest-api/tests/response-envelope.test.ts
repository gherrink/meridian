import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  createPaginatedResponseSchema,
  createSuccessResponseSchema,
  ErrorResponseSchema,
  PaginationMetaSchema,
} from '../src/schemas/response-envelope.js'

describe('responseEnvelopeSchemas', () => {
  describe('errorResponseSchema', () => {
    it('tC-33: parses valid error', () => {
      const result = ErrorResponseSchema.safeParse({
        error: { code: 'X', message: 'Y' },
      })

      expect(result.success).toBe(true)
    })

    it('tC-34: rejects missing code', () => {
      const result = ErrorResponseSchema.safeParse({
        error: { message: 'Y' },
      })

      expect(result.success).toBe(false)
    })
  })

  describe('createSuccessResponseSchema', () => {
    it('tC-35: wraps data', () => {
      const schema = createSuccessResponseSchema(z.string())

      const result = schema.safeParse({ data: 'hello' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toBe('hello')
      }
    })
  })

  describe('createPaginatedResponseSchema', () => {
    it('tC-36: parses paginated shape', () => {
      const schema = createPaginatedResponseSchema(z.number())

      const result = schema.safeParse({
        data: [1, 2],
        pagination: { page: 1, limit: 10, total: 2, hasMore: false },
      })

      expect(result.success).toBe(true)
    })
  })

  describe('paginationMetaSchema', () => {
    it('tC-37: rejects negative total', () => {
      const result = PaginationMetaSchema.safeParse({
        page: 1,
        limit: 10,
        total: -1,
        hasMore: false,
      })

      expect(result.success).toBe(false)
    })

    it('tC-38: rejects zero page', () => {
      const result = PaginationMetaSchema.safeParse({
        page: 0,
        limit: 10,
        total: 0,
        hasMore: false,
      })

      expect(result.success).toBe(false)
    })
  })
})
