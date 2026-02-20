import { z } from 'zod'

import { IssueIdSchema, IssueLinkIdSchema } from './value-objects.js'

export const IssueLinkSchema = z.object({
  id: IssueLinkIdSchema,
  sourceIssueId: IssueIdSchema,
  targetIssueId: IssueIdSchema,
  type: z.string().min(1),
  createdAt: z.date(),
})

export type IssueLink = z.infer<typeof IssueLinkSchema>

export const CreateIssueLinkInputSchema = z.object({
  sourceIssueId: IssueIdSchema,
  targetIssueId: IssueIdSchema,
  type: z.string().min(1),
})

export type CreateIssueLinkInput = z.infer<typeof CreateIssueLinkInputSchema>

export const IssueLinkFilterSchema = z.object({
  issueId: IssueIdSchema.optional(),
  type: z.string().optional(),
})

export type IssueLinkFilter = z.infer<typeof IssueLinkFilterSchema>

export const ResolvedIssueLinkSchema = z.object({
  id: IssueLinkIdSchema,
  linkedIssueId: IssueIdSchema,
  type: z.string(),
  label: z.string(),
  direction: z.enum(['outgoing', 'incoming']),
  createdAt: z.date(),
})

export type ResolvedIssueLink = z.infer<typeof ResolvedIssueLinkSchema>
