import { z } from 'zod'

import { UserIdSchema } from './value-objects.js'

export const UserSchema = z.object({
  id: UserIdSchema,
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().default(null),
  avatarUrl: z.string().url().nullable().default(null),
})

export type User = z.infer<typeof UserSchema>
