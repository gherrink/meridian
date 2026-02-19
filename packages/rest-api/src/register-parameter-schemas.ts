import type { OpenAPIHono } from '@hono/zod-openapi'

import { CommentIdParamsSchema, CommentPaginationQuerySchema, CommentParamsSchema } from './schemas/comment.js'
import { IssueFilterQuerySchema, IssueParamsSchema } from './schemas/issue.js'
import { LabelQuerySchema } from './schemas/label-query.js'
import { MilestoneOverviewParamsSchema } from './schemas/milestone-overview.js'
import { MilestonePaginationQuerySchema, MilestoneParamsSchema } from './schemas/milestone.js'
import { TagQuerySchema } from './schemas/tag-query.js'
import { UserParamsSchema, UserSearchQuerySchema } from './schemas/user.js'

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
  registry.register('CommentIdParams', CommentIdParamsSchema)
  registry.register('CommentPaginationQuery', CommentPaginationQuerySchema)
  registry.register('MilestoneParams', MilestoneParamsSchema)
  registry.register('MilestoneOverviewParams', MilestoneOverviewParamsSchema)
  registry.register('MilestonePaginationQuery', MilestonePaginationQuerySchema)
  registry.register('LabelQuery', LabelQuerySchema)
  registry.register('TagQuery', TagQuerySchema)
  registry.register('UserParams', UserParamsSchema)
  registry.register('UserSearchQuery', UserSearchQuerySchema)
}
