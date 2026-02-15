import type { RestApiDependencies } from './types.js'

import { requestId } from 'hono/request-id'

import { createAuditMiddleware, createCorsMiddleware, createErrorHandler } from './middleware/index.js'
import { createRouter } from './router-factory.js'
import { createHealthRouter } from './routes/health.js'

const API_PREFIX = '/api/v1' as const

export function createRestApiApp(dependencies: RestApiDependencies) {
  const app = createRouter()

  app.use('*', requestId())
  app.use('*', createCorsMiddleware(dependencies.config?.corsOrigins))
  app.use('*', createAuditMiddleware(dependencies.auditLogger))

  app.onError(createErrorHandler(dependencies.auditLogger))

  const healthRouter = createHealthRouter()
  app.route(API_PREFIX, healthRouter)

  app.doc('/doc', {
    openapi: '3.1.0',
    info: {
      title: 'Meridian REST API',
      version: '0.0.0',
      description: 'Unified interface for issue tracking systems',
    },
  })

  return app
}
