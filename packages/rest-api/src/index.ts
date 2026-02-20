export { createRestApiApp } from './app.js'
export { createAuditMiddleware, createCorsMiddleware, createErrorHandler, formatErrorResponse, isDomainError, mapDomainErrorToStatus } from './middleware/index.js'
export { createRouter } from './router-factory.js'
export { createCommentRouter } from './routes/comments.js'
export { createHealthRouter } from './routes/health.js'
export { createIssueLinkRouter } from './routes/issue-links.js'
export { createIssueRouter } from './routes/issues.js'
export { createLabelRouter } from './routes/labels.js'
export { createMilestoneRouter } from './routes/milestones.js'
export { createTagRouter } from './routes/tags.js'
export { createUserRouter } from './routes/users.js'
export {
  CommentIdParamsSchema,
  CommentPaginationQuerySchema,
  CommentParamsSchema,
  CommentResponseSchema,
  CreateCommentBodySchema,
  UpdateCommentBodySchema,
} from './schemas/comment.js'
export {
  CreateIssueLinkBodySchema,
  IssueLinkParamsSchema,
  IssueLinkResponseSchema,
  IssueLinksQuerySchema,
  ResolvedIssueLinkResponseSchema,
} from './schemas/issue-link.js'
export {
  CreateIssueBodySchema,
  IssueFilterQuerySchema,
  IssueParamsSchema,
  IssueResponseSchema,
  UpdateIssueBodySchema,
} from './schemas/issue.js'
export { LabelQuerySchema } from './schemas/label-query.js'
export { MilestoneOverviewParamsSchema } from './schemas/milestone-overview.js'
export {
  CreateMilestoneBodySchema,
  MilestoneOverviewResponseSchema,
  MilestonePaginationQuerySchema,
  MilestoneParamsSchema,
  MilestoneResponseSchema,
  UpdateMilestoneBodySchema,
} from './schemas/milestone.js'
export {
  createPaginatedResponseSchema,
  createSuccessResponseSchema,
  ErrorResponseSchema,
  PaginationMetaSchema,
} from './schemas/response-envelope.js'
export type {
  ErrorDetail,
  ErrorResponse,
  PaginationMeta,
} from './schemas/response-envelope.js'
export { TagQuerySchema } from './schemas/tag-query.js'
export { TagResponseSchema } from './schemas/tag.js'
export {
  UserParamsSchema,
  UserResponseSchema,
  UserSearchQuerySchema,
} from './schemas/user.js'
export type { RestApiConfig, RestApiDependencies } from './types.js'
