import { z } from '@hono/zod-openapi'

export const MilestoneOverviewParamsSchema = z.object({
  id: z.string().uuid(),
}).openapi('MilestoneOverviewParams')
