import { z } from '@hono/zod-openapi'

export const TagQuerySchema = z.object({
  milestoneId: z.string().uuid().optional(),
}).openapi('TagQuery')
