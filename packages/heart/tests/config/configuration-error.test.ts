import type { ConfigurationIssue } from '../../src/config/configuration-error.js'

import { DomainError } from '@meridian/core'

import { describe, expect, it } from 'vitest'
import { ConfigurationError } from '../../src/config/configuration-error.js'

describe('configurationError', () => {
  it('cE-01: extends DomainError', () => {
    const error = new ConfigurationError([{ field: 'X', message: 'M' }])

    expect(error).toBeInstanceOf(DomainError)
  })

  it('cE-02: has code CONFIGURATION_ERROR', () => {
    const error = new ConfigurationError([{ field: 'X', message: 'M' }])

    expect(error.code).toBe('CONFIGURATION_ERROR')
  })

  it('cE-03: formats single issue in message', () => {
    const error = new ConfigurationError([{ field: 'TOKEN', message: 'required' }])

    expect(error.message).toContain('TOKEN: required')
  })

  it('cE-04: formats multiple issues in message', () => {
    const error = new ConfigurationError([
      { field: 'TOKEN', message: 'required' },
      { field: 'OWNER', message: 'missing' },
    ])

    expect(error.message).toContain('TOKEN: required')
    expect(error.message).toContain('OWNER: missing')
  })

  it('cE-05: exposes frozen issues array', () => {
    const error = new ConfigurationError([{ field: 'X', message: 'M' }])

    expect(Object.isFrozen(error.issues)).toBe(true)
  })

  it('cE-06: issues array is a copy', () => {
    const original: ConfigurationIssue[] = [{ field: 'X', message: 'M' }]
    const error = new ConfigurationError(original)

    original.push({ field: 'Y', message: 'N' })

    expect(error.issues).toHaveLength(1)
    expect(error.issues[0]!.field).toBe('X')
  })
})
