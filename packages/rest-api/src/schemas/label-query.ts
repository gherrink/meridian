import { z } from '@hono/zod-openapi'

export const LabelQuerySchema = z.object({
  milestoneId: z.string().uuid().optional(),
}).openapi('LabelQuery')
