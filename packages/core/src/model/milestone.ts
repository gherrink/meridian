import { z } from 'zod'

import { MilestoneIdSchema } from './value-objects.js'

export const MilestoneSchema = z.object({
  id: MilestoneIdSchema,
  name: z.string().min(1).max(200),
  description: z.string().default(''),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Milestone = z.infer<typeof MilestoneSchema>

export const CreateMilestoneInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(''),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

export type CreateMilestoneInput = z.infer<typeof CreateMilestoneInputSchema>

export const UpdateMilestoneInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateMilestoneInput = z.infer<typeof UpdateMilestoneInputSchema>
