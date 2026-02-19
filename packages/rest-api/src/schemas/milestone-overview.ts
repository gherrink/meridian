import { z } from '@hono/zod-openapi'

export const MilestoneResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['open', 'closed']),
  dueDate: z.string().datetime().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi('Milestone')

export const MilestoneOverviewResponseSchema = z.object({
  milestone: MilestoneResponseSchema,
  totalIssues: z.number().int().nonnegative(),
  stateBreakdown: z.object({
    open: z.number().int().nonnegative(),
    in_progress: z.number().int().nonnegative(),
    done: z.number().int().nonnegative(),
  }),
}).openapi('MilestoneOverview')

export const MilestoneOverviewParamsSchema = z.object({
  id: z.string().uuid(),
}).openapi('MilestoneOverviewParams')

export const CreateMilestoneBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).openapi('CreateMilestoneRequest')
