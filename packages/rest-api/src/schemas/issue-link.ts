import { z } from '@hono/zod-openapi'

export const CreateIssueLinkBodySchema = z.object({
  targetIssueId: z.string().uuid(),
  type: z.string().min(1),
}).openapi('CreateIssueLinkRequest')

export const ResolvedIssueLinkResponseSchema = z.object({
  id: z.string().uuid(),
  linkedIssueId: z.string().uuid(),
  type: z.string(),
  label: z.string(),
  direction: z.enum(['outgoing', 'incoming']),
  createdAt: z.string().datetime(),
}).openapi('ResolvedIssueLink')

export const IssueLinkResponseSchema = z.object({
  id: z.string().uuid(),
  sourceIssueId: z.string().uuid(),
  targetIssueId: z.string().uuid(),
  type: z.string(),
  createdAt: z.string().datetime(),
}).openapi('IssueLink')

export const IssueLinkParamsSchema = z.object({
  id: z.string().uuid(),
}).openapi('IssueLinkParams')

export const IssueLinksQuerySchema = z.object({
  type: z.string().optional(),
}).openapi('IssueLinksQuery')
