import {
  AuthorizationError,
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from '@meridian/core'
import { describe, expect, it } from 'vitest'

import {
  formatErrorResponse,
  isDomainError,
  mapDomainErrorToStatus,
} from '../src/middleware/error-mapper.js'

describe('errorMapper', () => {
  describe('mapDomainErrorToStatus', () => {
    it('tC-01: maps NOT_FOUND to 404', () => {
      const error = new NotFoundError('Issue', '123')

      const result = mapDomainErrorToStatus(error)

      expect(result).toBe(404)
    })

    it('tC-02: maps VALIDATION_ERROR to 422', () => {
      const error = new ValidationError('title', 'required')

      const result = mapDomainErrorToStatus(error)

      expect(result).toBe(422)
    })

    it('tC-03: maps CONFLICT to 409', () => {
      const error = new ConflictError('Issue', '1', 'dup')

      const result = mapDomainErrorToStatus(error)

      expect(result).toBe(409)
    })

    it('tC-04: maps AUTHORIZATION_ERROR to 401', () => {
      const error = new AuthorizationError('delete', 'denied')

      const result = mapDomainErrorToStatus(error)

      expect(result).toBe(401)
    })

    it('tC-05: maps RATE_LIMITED to 429', () => {
      const error = new DomainError('rate', 'RATE_LIMITED')

      const result = mapDomainErrorToStatus(error)

      expect(result).toBe(429)
    })

    it('tC-06: maps unknown code to 500', () => {
      const error = new DomainError('msg', 'UNKNOWN_CODE')

      const result = mapDomainErrorToStatus(error)

      expect(result).toBe(500)
    })
  })

  describe('formatErrorResponse', () => {
    it('tC-07: returns error envelope with code and message', () => {
      const error = new NotFoundError('Issue', 'x')

      const result = formatErrorResponse(error)

      expect(result).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('not found'),
        },
      })
    })

    it('tC-42: does not include details field', () => {
      const error = new NotFoundError('Issue', 'x')

      const result = formatErrorResponse(error)

      expect(result.error).not.toHaveProperty('details')
    })
  })

  describe('isDomainError', () => {
    it('tC-08: returns true for DomainError', () => {
      const error = new NotFoundError('I', '1')

      const result = isDomainError(error)

      expect(result).toBe(true)
    })

    it('tC-09: returns false for plain Error', () => {
      const error = new Error('oops')

      const result = isDomainError(error)

      expect(result).toBe(false)
    })

    it('tC-10: returns false for non-error', () => {
      const result = isDomainError('string')

      expect(result).toBe(false)
    })
  })
})
