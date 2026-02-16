import { z } from '@hono/zod-openapi'

export const TagResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string().nullable(),
}).openapi('Tag')
