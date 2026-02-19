import { describe, expect, it } from 'vitest'

import { DEFAULT_STATUSES, StatusSchema } from '../../src/model/status.js'

describe('statusSchema', () => {
  it('contains exactly the expected default statuses', () => {
    expect(DEFAULT_STATUSES).toEqual(['backlog', 'ready', 'in_progress', 'in_review', 'done'])
  })

  it('accepts "backlog"', () => {
    const result = StatusSchema.safeParse('backlog')

    expect(result.success).toBe(true)
  })

  it('accepts "in_progress"', () => {
    const result = StatusSchema.safeParse('in_progress')

    expect(result.success).toBe(true)
  })

  it('accepts any non-empty string', () => {
    const result = StatusSchema.safeParse('custom_status')

    expect(result.success).toBe(true)
  })

  it('rejects an empty string', () => {
    const result = StatusSchema.safeParse('')

    expect(result.success).toBe(false)
  })
})
