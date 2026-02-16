import { AuthorizationError, ConflictError, DomainError, NotFoundError, ValidationError } from '@meridian/core'
import { describe, expect, it } from 'vitest'

import { formatErrorResponse, formatSuccessResponse, formatUnknownErrorResponse, isDomainError } from '../src/helpers/format-response.js'

describe('formatSuccessResponse', () => {
  it('tC-01: formats object as pretty JSON', () => {
    const result = formatSuccessResponse({ id: '1', title: 'Test' })

    expect(result.content[0]!.type).toBe('text')
    expect(result.content[0]!.text).toBe(JSON.stringify({ id: '1', title: 'Test' }, null, 2))
    expect(result.isError).toBeUndefined()
  })

  it('tC-02: formats string value', () => {
    const result = formatSuccessResponse('hello')

    expect(result.content[0]!.text).toBe('"hello"')
  })

  it('tC-03: formats null', () => {
    const result = formatSuccessResponse(null)

    expect(result.content[0]!.text).toBe('null')
  })

  it('tC-04: formats array', () => {
    const result = formatSuccessResponse([1, 2, 3])

    expect(result.content[0]!.text).toBe(JSON.stringify([1, 2, 3], null, 2))
    expect(result.content).toHaveLength(1)
  })

  it('tC-05: content array has single text element', () => {
    const result = formatSuccessResponse({ a: 1 })

    expect(result.content).toHaveLength(1)
    expect(result.content[0]!.type).toBe('text')
  })

  it('tC-37: formatSuccessResponse with undefined does not throw', () => {
    expect(() => formatSuccessResponse(undefined)).not.toThrow()
  })

  it('tC-38: formatSuccessResponse with deeply nested object', () => {
    const deepObj = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: { value: 'deep' },
            },
          },
        },
      },
    }

    const result = formatSuccessResponse(deepObj)

    const parsed = JSON.parse(result.content[0]!.text)
    expect(parsed.level1.level2.level3.level4.level5.value).toBe('deep')
  })
})

describe('formatErrorResponse', () => {
  it('tC-06: formats NotFoundError', () => {
    const result = formatErrorResponse(new NotFoundError('Issue', '123'))

    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0]!.text)
    expect(parsed.code).toBe('NOT_FOUND')
    expect(parsed.message).toBe('Issue with id \'123\' not found')
  })

  it('tC-07: formats ValidationError', () => {
    const result = formatErrorResponse(new ValidationError('title', 'required'))

    const parsed = JSON.parse(result.content[0]!.text)
    expect(parsed.code).toBe('VALIDATION_ERROR')
    expect(parsed.message).toContain('title')
  })

  it('tC-08: formats ConflictError', () => {
    const result = formatErrorResponse(new ConflictError('Issue', '1', 'dup'))

    const parsed = JSON.parse(result.content[0]!.text)
    expect(parsed.code).toBe('CONFLICT')
    expect(parsed.message).toEqual(expect.stringContaining('Conflict'))
  })

  it('tC-09: formats AuthorizationError', () => {
    const result = formatErrorResponse(new AuthorizationError('delete', 'denied'))

    const parsed = JSON.parse(result.content[0]!.text)
    expect(parsed.code).toBe('AUTHORIZATION_ERROR')
  })

  it('tC-10: always sets isError true', () => {
    const result = formatErrorResponse(new DomainError('test', 'SOME_CODE'))

    expect(result.isError).toBe(true)
  })

  it('tC-39: formatErrorResponse preserves full message', () => {
    const result = formatErrorResponse(new DomainError('A very detailed error message about what went wrong', 'CUSTOM'))

    const parsed = JSON.parse(result.content[0]!.text)
    expect(parsed.message).toBe('A very detailed error message about what went wrong')
  })
})

describe('formatUnknownErrorResponse', () => {
  it('tC-11: returns generic error', () => {
    const result = formatUnknownErrorResponse()

    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toBe('Internal error')
  })

  it('tC-12: no structured code in body', () => {
    const result = formatUnknownErrorResponse()

    expect(result.content[0]!.text).not.toContain('code')
  })
})

describe('isDomainError', () => {
  it('tC-13: true for DomainError instance', () => {
    expect(isDomainError(new NotFoundError('I', '1'))).toBe(true)
  })

  it('tC-14: true for base DomainError', () => {
    expect(isDomainError(new DomainError('msg', 'CODE'))).toBe(true)
  })

  it('tC-15: false for plain Error', () => {
    expect(isDomainError(new Error('oops'))).toBe(false)
  })

  it('tC-16: false for string', () => {
    expect(isDomainError('some string')).toBe(false)
  })

  it('tC-17: false for null', () => {
    expect(isDomainError(null)).toBe(false)
  })

  it('tC-18: false for undefined', () => {
    expect(isDomainError(undefined)).toBe(false)
  })
})
