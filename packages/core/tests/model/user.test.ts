import { describe, expect, it } from 'vitest'

import { UserSchema } from '../../src/model/user.js'
import { TEST_USER_ID } from '../helpers/fixtures.js'

describe('userSchema', () => {
  it('validates a complete user', () => {
    const input = {
      id: TEST_USER_ID,
      name: 'Jane Doe',
      email: 'jane@example.com',
      avatarUrl: 'https://example.com/avatar.png',
    }

    const result = UserSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Jane Doe')
      expect(result.data.email).toBe('jane@example.com')
      expect(result.data.avatarUrl).toBe('https://example.com/avatar.png')
    }
  })

  it('applies default null for email when omitted', () => {
    const input = {
      id: TEST_USER_ID,
      name: 'Jane Doe',
    }

    const result = UserSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBeNull()
    }
  })

  it('applies default null for avatarUrl when omitted', () => {
    const input = {
      id: TEST_USER_ID,
      name: 'Jane Doe',
    }

    const result = UserSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.avatarUrl).toBeNull()
    }
  })

  it('accepts null for email explicitly', () => {
    const input = {
      id: TEST_USER_ID,
      name: 'Jane Doe',
      email: null,
      avatarUrl: null,
    }

    const result = UserSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBeNull()
    }
  })

  it('rejects an empty name', () => {
    const input = {
      id: TEST_USER_ID,
      name: '',
    }

    const result = UserSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects a name exceeding 200 characters', () => {
    const input = {
      id: TEST_USER_ID,
      name: 'a'.repeat(201),
    }

    const result = UserSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects an invalid email format', () => {
    const input = {
      id: TEST_USER_ID,
      name: 'Jane Doe',
      email: 'not-an-email',
    }

    const result = UserSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects an invalid avatarUrl format', () => {
    const input = {
      id: TEST_USER_ID,
      name: 'Jane Doe',
      avatarUrl: 'not-a-url',
    }

    const result = UserSchema.safeParse(input)

    expect(result.success).toBe(false)
  })
})
