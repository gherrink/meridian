import { z } from '@hono/zod-openapi'

import { TagResponseSchema } from './tag.js'

export const IssueResponseSchema = z.object({
  id: z.string().uuid(),
  milestoneId: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string(),
  state: z.enum(['open', 'in_progress', 'done']),
  status: z.string(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  parentId: z.string().uuid().nullable(),
  assigneeIds: z.array(z.string().uuid()),
  tags: z.array(TagResponseSchema),
  dueDate: z.string().datetime().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi('Issue')

export const CreateIssueBodySchema = z.object({
  milestoneId: z.string().uuid().nullable().optional().default(null),
  title: z.string().min(1).max(500),
  description: z.string().optional().default(''),
  state: z.enum(['open', 'in_progress', 'done']).optional().default('open'),
  status: z.string().min(1).optional().default('backlog'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  parentId: z.string().uuid().nullable().optional().default(null),
  assigneeIds: z.array(z.string().uuid()).optional().default([]),
  tags: z.array(TagResponseSchema).optional().default([]),
  dueDate: z.string().datetime().nullable().optional().default(null),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
}).openapi('CreateIssueRequest')

export const UpdateIssueBodySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  state: z.enum(['open', 'in_progress', 'done']).optional(),
  status: z.string().min(1).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  parentId: z.string().uuid().nullable().optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  tags: z.array(TagResponseSchema).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).openapi('UpdateIssueRequest')

export const IssueParamsSchema = z.object({
  id: z.string().uuid(),
}).openapi('IssueParams')

export const IssueFilterQuerySchema = z.object({
  milestoneId: z.string().uuid().optional(),
  state: z.enum(['open', 'in_progress', 'done']).optional(),
  status: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  parentId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
}).openapi('IssueFilterQuery')
