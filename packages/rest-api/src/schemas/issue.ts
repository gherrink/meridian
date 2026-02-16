import { z } from '@hono/zod-openapi'

import { TagResponseSchema } from './tag.js'

export const IssueResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['open', 'in_progress', 'closed']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  assigneeIds: z.array(z.string().uuid()),
  tags: z.array(TagResponseSchema),
  dueDate: z.string().datetime().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi('Issue')

export const CreateIssueBodySchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().optional().default(''),
  status: z.enum(['open', 'in_progress', 'closed']).optional().default('open'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  assigneeIds: z.array(z.string().uuid()).optional().default([]),
  tags: z.array(TagResponseSchema).optional().default([]),
  dueDate: z.string().datetime().nullable().optional().default(null),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
}).openapi('CreateIssueRequest')

export const UpdateIssueBodySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  tags: z.array(TagResponseSchema).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).openapi('UpdateIssueRequest')

export const IssueParamsSchema = z.object({
  id: z.string().uuid(),
}).openapi('IssueParams')

export const IssueFilterQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['open', 'in_progress', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assigneeId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
}).openapi('IssueFilterQuery')
