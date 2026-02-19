import { z } from '@hono/zod-openapi'

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().nullable(),
  avatarUrl: z.string().nullable(),
}).openapi('User')

export const UserParamsSchema = z.object({
  id: z.string().uuid(),
}).openapi('UserParams')

export const UserSearchQuerySchema = z.object({
  query: z.string().optional().default(''),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
}).openapi('UserSearchQuery')
