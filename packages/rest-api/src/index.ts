export { createRestApiApp } from './app.js'
export { createAuditMiddleware, createCorsMiddleware, createErrorHandler, formatErrorResponse, isDomainError, mapDomainErrorToStatus } from './middleware/index.js'
export { createRouter } from './router-factory.js'
export { createHealthRouter } from './routes/health.js'
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
export type { RestApiConfig, RestApiDependencies } from './types.js'
