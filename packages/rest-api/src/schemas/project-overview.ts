import { z } from '@hono/zod-openapi'

const ProjectResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const ProjectOverviewResponseSchema = z.object({
  project: ProjectResponseSchema,
  totalIssues: z.number().int().nonnegative(),
  statusBreakdown: z.object({
    open: z.number().int().nonnegative(),
    in_progress: z.number().int().nonnegative(),
    closed: z.number().int().nonnegative(),
  }),
})

export const ProjectOverviewParamsSchema = z.object({
  id: z.string().uuid(),
})
