import { z } from 'zod'

export const PrioritySchema = z.enum(['low', 'normal', 'high', 'urgent'])
export type Priority = z.infer<typeof PrioritySchema>

export const PRIORITY_VALUES = PrioritySchema.options
