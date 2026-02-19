import { z } from 'zod'

import { TagIdSchema } from './value-objects.js'

export const TagSchema = z.object({
  id: TagIdSchema,
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().default(null),
})

export type Tag = z.infer<typeof TagSchema>

export const CreateTagInputSchema = TagSchema.pick({
  name: true,
  color: true,
})

export type CreateTagInput = z.infer<typeof CreateTagInputSchema>

export const UpdateTagInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().optional(),
})

export type UpdateTagInput = z.infer<typeof UpdateTagInputSchema>
