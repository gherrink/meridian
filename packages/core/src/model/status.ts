import { z } from 'zod'

export const StatusSchema = z.string().min(1)
export type Status = z.infer<typeof StatusSchema>

export const DEFAULT_STATUSES = ['backlog', 'ready', 'in_progress', 'in_review', 'done'] as const
