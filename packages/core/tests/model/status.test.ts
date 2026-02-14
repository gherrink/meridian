import { describe, expect, it } from 'vitest'

import { STATUS_VALUES, StatusSchema } from '../../src/model/status.js'

describe('statusSchema', () => {
  it('contains exactly the expected values', () => {
    expect(STATUS_VALUES).toEqual(['open', 'in_progress', 'closed'])
  })

  it('accepts "open"', () => {
    const result = StatusSchema.safeParse('open')

    expect(result.success).toBe(true)
  })

  it('accepts "in_progress"', () => {
    const result = StatusSchema.safeParse('in_progress')

    expect(result.success).toBe(true)
  })

  it('accepts "closed"', () => {
    const result = StatusSchema.safeParse('closed')

    expect(result.success).toBe(true)
  })

  it('rejects an invalid status', () => {
    const result = StatusSchema.safeParse('pending')

    expect(result.success).toBe(false)
  })

  it('rejects an empty string', () => {
    const result = StatusSchema.safeParse('')

    expect(result.success).toBe(false)
  })
})
