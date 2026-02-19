import { z } from 'zod'

export const StateSchema = z.enum(['open', 'in_progress', 'done'])
export type State = z.infer<typeof StateSchema>

export const STATE_VALUES = StateSchema.options
