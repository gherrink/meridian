import { z } from '@hono/zod-openapi'

export const CommentResponseSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  authorId: z.string().uuid(),
  issueId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const CreateCommentBodySchema = z.object({
  body: z.string().min(1),
  authorId: z.string().uuid(),
})

export const CommentParamsSchema = z.object({
  id: z.string().uuid(),
})

export const CommentPaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})
