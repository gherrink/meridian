import { z } from '@hono/zod-openapi'

export const LabelQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
}).openapi('LabelQuery')
