import { describe, expect, it } from 'vitest'

import {
  CommentIdSchema,
  EpicIdSchema,
  IssueIdSchema,
  ProjectIdSchema,
  TagIdSchema,
  UserIdSchema,
} from '../../src/model/value-objects.js'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

const brandedIdSchemas = [
  { name: 'IssueIdSchema', schema: IssueIdSchema },
  { name: 'EpicIdSchema', schema: EpicIdSchema },
  { name: 'ProjectIdSchema', schema: ProjectIdSchema },
  { name: 'CommentIdSchema', schema: CommentIdSchema },
  { name: 'UserIdSchema', schema: UserIdSchema },
  { name: 'TagIdSchema', schema: TagIdSchema },
] as const

describe('value objects', () => {
  for (const { name, schema } of brandedIdSchemas) {
    describe(name, () => {
      it('accepts a valid UUID', () => {
        const result = schema.safeParse(VALID_UUID)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(VALID_UUID)
        }
      })

      it('rejects a non-UUID string', () => {
        const result = schema.safeParse('not-a-uuid')

        expect(result.success).toBe(false)
      })

      it('rejects an empty string', () => {
        const result = schema.safeParse('')

        expect(result.success).toBe(false)
      })

      it('rejects a number', () => {
        const result = schema.safeParse(123)

        expect(result.success).toBe(false)
      })
    })
  }
})
