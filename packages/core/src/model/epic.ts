import { z } from 'zod'

import { StatusSchema } from './status.js'
import { EpicIdSchema, IssueIdSchema, MilestoneIdSchema } from './value-objects.js'

export const EpicSchema = z.object({
  id: EpicIdSchema,
  milestoneId: MilestoneIdSchema,
  title: z.string().min(1).max(500),
  description: z.string().default(''),
  issueIds: z.array(IssueIdSchema).default([]),
  status: StatusSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Epic = z.infer<typeof EpicSchema>

export const CreateEpicInputSchema = z.object({
  milestoneId: MilestoneIdSchema,
  title: z.string().min(1).max(500),
  description: z.string().optional().default(''),
  status: StatusSchema.optional().default('open'),
  issueIds: z.array(IssueIdSchema).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

export type CreateEpicInput = z.infer<typeof CreateEpicInputSchema>

export const UpdateEpicInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: StatusSchema.optional(),
  issueIds: z.array(IssueIdSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateEpicInput = z.infer<typeof UpdateEpicInputSchema>
