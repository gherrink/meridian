import { describe, expect, it } from 'vitest'

import { parseUserId, unwrapResultOrThrow } from '../src/routes/route-helpers.js'

const FALLBACK_USER_ID = '00000000-0000-0000-0000-000000000000'

describe('routeHelpers', () => {
  describe('parseUserId', () => {
    it('e-10: valid UUID returns that UUID', () => {
      const uuid = '00000000-0000-4000-8000-000000000001'

      const result = parseUserId(uuid)

      expect(result).toBe(uuid)
    })

    it('e-11: invalid string returns FALLBACK_USER_ID', () => {
      const result = parseUserId('not-uuid')

      expect(result).toBe(FALLBACK_USER_ID)
    })

    it('e-11b: undefined returns FALLBACK_USER_ID', () => {
      const result = parseUserId(undefined)

      expect(result).toBe(FALLBACK_USER_ID)
    })
  })

  describe('unwrapResultOrThrow', () => {
    it('e-12: success result returns value', () => {
      const value = { id: '123', name: 'test' }
      const result = { ok: true as const, value }

      const unwrapped = unwrapResultOrThrow(result)

      expect(unwrapped).toBe(value)
    })

    it('e-13: failure result throws the error', () => {
      const error = new Error('something failed')
      const result = { ok: false as const, error }

      expect(() => unwrapResultOrThrow(result)).toThrow(error)
    })
  })
})
