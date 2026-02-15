import {
  AuthorizationError,
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from '@meridian/core'
import { describe, expect, it } from 'vitest'

import { mapGitHubError } from '../../src/mappers/error-mapper.js'

describe('errorMapper', () => {
  describe('mapGitHubError', () => {
    it('eM-01: 404 -> NotFoundError', () => {
      const error = {
        response: { status: 404, data: { message: 'Not Found' } },
      }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(NotFoundError)
    })

    it('eM-02: 401 -> AuthorizationError', () => {
      const error = {
        response: { status: 401 },
      }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(AuthorizationError)
    })

    it('eM-03: 403 -> AuthorizationError', () => {
      const error = {
        response: { status: 403 },
      }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(AuthorizationError)
    })

    it('eM-04: 422 -> ValidationError with field', () => {
      const error = {
        response: {
          status: 422,
          data: {
            errors: [{ field: 'title', message: 'missing' }],
          },
        },
      }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(ValidationError)
      expect((result as ValidationError).field).toBe('title')
    })

    it('eM-05: 422 without field errors', () => {
      const error = {
        response: {
          status: 422,
          data: { message: 'Unprocessable' },
        },
      }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(ValidationError)
      expect((result as ValidationError).field).toBe('unknown')
    })

    it('eM-06: 409 -> ConflictError', () => {
      const error = {
        response: { status: 409 },
      }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(ConflictError)
    })

    it('eM-07: 429 -> DomainError RATE_LIMITED', () => {
      const error = {
        response: { status: 429, headers: {} },
      }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(DomainError)
      expect(result.code).toBe('RATE_LIMITED')
    })

    it('eM-08: 429 with reset header', () => {
      const error = {
        response: {
          status: 429,
          headers: { 'x-ratelimit-reset': '1700000000' },
        },
      }

      const result = mapGitHubError(error)

      expect(result.message).toContain('Resets at')
    })

    it('eM-09: 500 -> DomainError GITHUB_SERVER_ERROR', () => {
      const error = {
        response: { status: 500 },
      }

      const result = mapGitHubError(error)

      expect(result.code).toBe('GITHUB_SERVER_ERROR')
    })

    it('eM-10: unknown error -> DomainError GITHUB_ERROR', () => {
      const error = { message: 'something' }

      const result = mapGitHubError(error)

      expect(result.code).toBe('GITHUB_ERROR')
    })

    it('eM-11: status on root (no response)', () => {
      const error = { status: 404, message: 'Not Found' }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(NotFoundError)
    })
  })

  describe('edge cases', () => {
    it('eC-03: mapGitHubError with empty object error', () => {
      const resultEmpty = mapGitHubError({})
      expect(resultEmpty).toBeInstanceOf(DomainError)
    })
  })
})
