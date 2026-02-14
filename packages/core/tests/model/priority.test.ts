import { describe, expect, it } from 'vitest'

import { PRIORITY_VALUES, PrioritySchema } from '../../src/model/priority.js'

describe('prioritySchema', () => {
  it('contains exactly the expected values in order', () => {
    expect(PRIORITY_VALUES).toEqual(['low', 'normal', 'high', 'urgent'])
  })

  it('accepts "low"', () => {
    const result = PrioritySchema.safeParse('low')

    expect(result.success).toBe(true)
  })

  it('accepts "normal"', () => {
    const result = PrioritySchema.safeParse('normal')

    expect(result.success).toBe(true)
  })

  it('accepts "high"', () => {
    const result = PrioritySchema.safeParse('high')

    expect(result.success).toBe(true)
  })

  it('accepts "urgent"', () => {
    const result = PrioritySchema.safeParse('urgent')

    expect(result.success).toBe(true)
  })

  it('rejects an invalid priority', () => {
    const result = PrioritySchema.safeParse('critical')

    expect(result.success).toBe(false)
  })

  it('rejects an empty string', () => {
    const result = PrioritySchema.safeParse('')

    expect(result.success).toBe(false)
  })
})
