import { z } from 'zod'

export const StatusSchema = z.enum(['open', 'in_progress', 'closed'])
export type Status = z.infer<typeof StatusSchema>

export const STATUS_VALUES = StatusSchema.options
