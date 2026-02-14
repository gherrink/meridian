import { describe, expect, it } from 'vitest'

import {
  CommentSchema,
  CreateCommentInputSchema,
  UpdateCommentInputSchema,
} from '../../src/model/comment.js'
import { createCommentFixture, TEST_ISSUE_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('commentSchema', () => {
  it('validates a complete comment', () => {
    const input = createCommentFixture()

    const result = CommentSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.body).toBe('Test comment body')
      expect(result.data.authorId).toBe(TEST_USER_ID)
      expect(result.data.issueId).toBe(TEST_ISSUE_ID)
    }
  })

  it('rejects an empty body', () => {
    const input = createCommentFixture({ body: '' })

    const result = CommentSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = CommentSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})

describe('createCommentInputSchema', () => {
  it('validates input with body, authorId, and issueId', () => {
    const input = {
      body: 'A new comment',
      authorId: TEST_USER_ID,
      issueId: TEST_ISSUE_ID,
    }

    const result = CreateCommentInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.body).toBe('A new comment')
    }
  })

  it('rejects empty body', () => {
    const input = {
      body: '',
      authorId: TEST_USER_ID,
      issueId: TEST_ISSUE_ID,
    }

    const result = CreateCommentInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects missing body', () => {
    const input = {
      authorId: TEST_USER_ID,
      issueId: TEST_ISSUE_ID,
    }

    const result = CreateCommentInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })
})

describe('updateCommentInputSchema', () => {
  it('validates input with body', () => {
    const input = { body: 'Updated comment' }

    const result = UpdateCommentInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.body).toBe('Updated comment')
    }
  })

  it('accepts empty object since body is optional', () => {
    const result = UpdateCommentInputSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('rejects empty body string when provided', () => {
    const input = { body: '' }

    const result = UpdateCommentInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })
})
