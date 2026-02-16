import type { OpenAPIHono } from '@hono/zod-openapi'

import { CommentPaginationQuerySchema, CommentParamsSchema } from './schemas/comment.js'
import { IssueFilterQuerySchema, IssueParamsSchema } from './schemas/issue.js'
import { LabelQuerySchema } from './schemas/label-query.js'
import { ProjectOverviewParamsSchema } from './schemas/project-overview.js'

/**
 * Registers parameter and query schemas as named OpenAPI components.
 *
 * By default, @hono/zod-openapi inlines parameter/query schemas as individual
 * OpenAPI parameter objects rather than placing them in components/schemas.
 * This function explicitly registers them so they appear as named schema
 * components alongside the body/response schemas.
 */
export function registerParameterSchemas(registry: OpenAPIHono['openAPIRegistry']): void {
  registry.register('IssueParams', IssueParamsSchema)
  registry.register('IssueFilterQuery', IssueFilterQuerySchema)
  registry.register('CommentParams', CommentParamsSchema)
  registry.register('CommentPaginationQuery', CommentPaginationQuerySchema)
  registry.register('ProjectOverviewParams', ProjectOverviewParamsSchema)
  registry.register('LabelQuery', LabelQuerySchema)
}
