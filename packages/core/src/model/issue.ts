import { z } from 'zod'

import { PrioritySchema } from './priority.js'
import { StateSchema } from './state.js'
import { StatusSchema } from './status.js'
import { TagSchema } from './tag.js'
import { IssueIdSchema, MilestoneIdSchema, UserIdSchema } from './value-objects.js'

export const IssueSchema = z.object({
  id: IssueIdSchema,
  milestoneId: MilestoneIdSchema.nullable(),
  title: z.string().min(1).max(500),
  description: z.string().default(''),
  state: StateSchema,
  status: StatusSchema,
  priority: PrioritySchema,
  parentId: IssueIdSchema.nullable(),
  assigneeIds: z.array(UserIdSchema).default([]),
  tags: z.array(TagSchema).default([]),
  dueDate: z.date().nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Issue = z.infer<typeof IssueSchema>

export const CreateIssueInputSchema = z.object({
  milestoneId: MilestoneIdSchema.nullable().default(null),
  title: z.string().min(1).max(500),
  description: z.string().optional().default(''),
  state: StateSchema.optional().default('open'),
  status: StatusSchema.optional().default('backlog'),
  priority: PrioritySchema.optional().default('normal'),
  parentId: IssueIdSchema.nullable().optional().default(null),
  assigneeIds: z.array(UserIdSchema).optional().default([]),
  tags: z.array(TagSchema).optional().default([]),
  dueDate: z.date().nullable().optional().default(null),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>

export const UpdateIssueInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  state: StateSchema.optional(),
  status: StatusSchema.optional(),
  priority: PrioritySchema.optional(),
  parentId: IssueIdSchema.nullable().optional(),
  assigneeIds: z.array(UserIdSchema).optional(),
  tags: z.array(TagSchema).optional(),
  dueDate: z.date().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type UpdateIssueInput = z.infer<typeof UpdateIssueInputSchema>

export const IssueFilterSchema = z.object({
  milestoneId: MilestoneIdSchema.nullable().optional(),
  state: StateSchema.optional(),
  status: z.string().optional(),
  priority: PrioritySchema.optional(),
  parentId: IssueIdSchema.nullable().optional(),
  assigneeId: UserIdSchema.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type IssueFilter = z.infer<typeof IssueFilterSchema>
