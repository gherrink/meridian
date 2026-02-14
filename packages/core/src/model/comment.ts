import { z } from 'zod'

import { CommentIdSchema, IssueIdSchema, UserIdSchema } from './value-objects.js'

export const CommentSchema = z.object({
  id: CommentIdSchema,
  body: z.string().min(1),
  authorId: UserIdSchema,
  issueId: IssueIdSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Comment = z.infer<typeof CommentSchema>

export const CreateCommentInputSchema = z.object({
  body: z.string().min(1),
  authorId: UserIdSchema,
  issueId: IssueIdSchema,
})

export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>

export const UpdateCommentInputSchema = z.object({
  body: z.string().min(1).optional(),
})

export type UpdateCommentInput = z.infer<typeof UpdateCommentInputSchema>
