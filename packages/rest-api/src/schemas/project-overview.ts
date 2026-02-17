import { z } from '@hono/zod-openapi'

export const ProjectResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi('Project')

export const ProjectOverviewResponseSchema = z.object({
  project: ProjectResponseSchema,
  totalIssues: z.number().int().nonnegative(),
  statusBreakdown: z.object({
    open: z.number().int().nonnegative(),
    in_progress: z.number().int().nonnegative(),
    closed: z.number().int().nonnegative(),
  }),
}).openapi('ProjectOverview')

export const ProjectOverviewParamsSchema = z.object({
  id: z.string().uuid(),
}).openapi('ProjectOverviewParams')

export const CreateProjectBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).openapi('CreateProjectRequest')
