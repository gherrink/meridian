export { createRestApiApp } from './app.js'
export { createAuditMiddleware, createCorsMiddleware, createErrorHandler, formatErrorResponse, isDomainError, mapDomainErrorToStatus } from './middleware/index.js'
export { createRouter } from './router-factory.js'
export { createCommentRouter } from './routes/comments.js'
export { createHealthRouter } from './routes/health.js'
export { createIssueRouter } from './routes/issues.js'
export { createLabelRouter } from './routes/labels.js'
export { createProjectRouter } from './routes/projects.js'
export {
  CommentPaginationQuerySchema,
  CommentParamsSchema,
  CommentResponseSchema,
  CreateCommentBodySchema,
} from './schemas/comment.js'
export {
  CreateIssueBodySchema,
  IssueFilterQuerySchema,
  IssueParamsSchema,
  IssueResponseSchema,
  UpdateIssueBodySchema,
} from './schemas/issue.js'
export {
  ProjectOverviewParamsSchema,
  ProjectOverviewResponseSchema,
} from './schemas/project-overview.js'
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
export { TagResponseSchema } from './schemas/tag.js'
export type { RestApiConfig, RestApiDependencies } from './types.js'
