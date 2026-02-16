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

    it('eM-02a: 401 message contains "Invalid or expired"', () => {
      const error = {
        response: { status: 401 },
      }

      const result = mapGitHubError(error)

      expect(result.message).toContain('Invalid or expired')
    })

    it('eM-03: 403 -> AuthorizationError', () => {
      const error = {
        response: { status: 403 },
      }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(AuthorizationError)
    })

    it('eM-03a: 403 without permissions header contains "Insufficient permissions"', () => {
      const error = {
        response: { status: 403 },
      }

      const result = mapGitHubError(error)

      expect(result.message).toContain('Insufficient permissions')
    })

    it('eM-03b: 403 with x-accepted-github-permissions header includes header value', () => {
      const error = {
        response: {
          status: 403,
          headers: { 'x-accepted-github-permissions': 'issues:write' },
        },
      }

      const result = mapGitHubError(error)

      expect(result.message).toContain('issues:write')
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

    it('eM-12: 401 message contains "Invalid or expired authentication token"', () => {
      const error = { response: { status: 401 } }

      const result = mapGitHubError(error)

      expect(result.message).toContain('Invalid or expired authentication token')
    })

    it('eM-13: 401 error has code AUTHORIZATION_ERROR', () => {
      const error = { response: { status: 401 } }

      const result = mapGitHubError(error)

      expect(result.code).toBe('AUTHORIZATION_ERROR')
    })

    it('eM-14: 401 message contains action context', () => {
      const error = { response: { status: 401 } }

      const result = mapGitHubError(error)

      expect(result.message).toContain('access GitHub resource')
    })

    it('eM-15: 403 without permissions header gives default scope hint', () => {
      const error = {
        response: { status: 403, data: { message: 'Forbidden' } },
      }

      const result = mapGitHubError(error)

      expect(result.message).toContain('repo, public_repo, read:org')
    })

    it('eM-16: 403 with x-accepted-github-permissions header uses it', () => {
      const error = {
        response: {
          status: 403,
          headers: { 'x-accepted-github-permissions': 'issues: write' },
        },
      }

      const result = mapGitHubError(error)

      expect(result.message).toContain('issues: write')
      expect(result.message).not.toContain('repo, public_repo')
    })

    it('eM-17: 403 message contains "Insufficient permissions"', () => {
      const error = { response: { status: 403 } }

      const result = mapGitHubError(error)

      expect(result.message).toContain('Insufficient permissions')
    })

    it('eM-18: 403 error has code AUTHORIZATION_ERROR', () => {
      const error = { response: { status: 403 } }

      const result = mapGitHubError(error)

      expect(result.code).toBe('AUTHORIZATION_ERROR')
    })

    it('eM-19: 403 error is instance of AuthorizationError', () => {
      const error = {
        response: {
          status: 403,
          headers: { 'x-accepted-github-permissions': 'issues: write' },
        },
      }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(AuthorizationError)
    })

    it('eM-20: 401 with data message ignores it (uses fixed message)', () => {
      const error = {
        response: { status: 401, data: { message: 'Bad credentials' } },
      }

      const result = mapGitHubError(error)

      expect(result.message).toContain('Invalid or expired')
      expect(result.message).not.toMatch(/^Bad credentials$/)
    })

    it('eM-21: 401 from root status (no response object)', () => {
      const error = { status: 401, message: 'Unauthorized' }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(AuthorizationError)
    })

    it('eM-22: 403 from root status (no response object)', () => {
      const error = { status: 403, message: 'Forbidden' }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(AuthorizationError)
    })
  })

  describe('edge cases', () => {
    it('eC-03: mapGitHubError with empty object error', () => {
      const resultEmpty = mapGitHubError({})
      expect(resultEmpty).toBeInstanceOf(DomainError)
    })

    it('eC-08: 403 with empty permissions header falls back to default scope hint', () => {
      const error = {
        response: {
          status: 403,
          headers: { 'x-accepted-github-permissions': '' },
        },
      }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(AuthorizationError)
      expect(result.message).toContain('repo, public_repo, read:org')
    })

    it('eC-09: 403 with no headers object at all returns AuthorizationError with default scope hint', () => {
      const error = {
        response: { status: 403, data: { message: 'Forbidden' } },
      }

      const result = mapGitHubError(error)

      expect(result).toBeInstanceOf(AuthorizationError)
      expect(result.message).toContain('repo, public_repo, read:org')
    })

    it('eC-10: 5xx errors are NOT mapped to AuthorizationError', () => {
      const error = { response: { status: 503 } }

      const result = mapGitHubError(error)

      expect(result.code).toBe('GITHUB_SERVER_ERROR')
      expect(result).not.toBeInstanceOf(AuthorizationError)
    })
  })
})
