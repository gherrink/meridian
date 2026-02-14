import { z } from 'zod'

import { ProjectIdSchema } from './value-objects.js'

export const ProjectSchema = z.object({
  id: ProjectIdSchema,
  name: z.string().min(1).max(200),
  description: z.string().default(''),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Project = z.infer<typeof ProjectSchema>

export const CreateProjectInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().default(''),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>

export const UpdateProjectInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>
