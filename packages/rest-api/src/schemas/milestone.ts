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

export const MilestoneParamsSchema = z.object({
  id: z.string().uuid(),
}).openapi('MilestoneParams')

export const CreateMilestoneBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['open', 'closed']).optional().default('open'),
  dueDate: z.string().datetime().nullable().optional().default(null),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).openapi('CreateMilestoneRequest')

export const UpdateMilestoneBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['open', 'closed']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).openapi('UpdateMilestoneRequest')

export const MilestonePaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
}).openapi('MilestonePaginationQuery')
