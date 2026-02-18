import type { RestApiDependencies } from './types.js'

import { apiReference } from '@scalar/hono-api-reference'
import { requestId } from 'hono/request-id'

import { createAuditMiddleware, createCorsMiddleware, createErrorHandler } from './middleware/index.js'
import { OPENAPI_CONFIG } from './openapi-config.js'
import { registerParameterSchemas } from './register-parameter-schemas.js'
import { createRouter } from './router-factory.js'
import { createCommentRouter } from './routes/comments.js'
import { createHealthRouter } from './routes/health.js'
import { createIssueRouter } from './routes/issues.js'
import { createLabelRouter } from './routes/labels.js'
import { createMilestoneRouter } from './routes/milestones.js'

const API_PREFIX = '/api/v1' as const

export function createRestApiApp(dependencies: RestApiDependencies) {
  const app = createRouter()

  app.use('*', requestId())
  app.use('*', createCorsMiddleware(dependencies.config?.corsOrigins))
  app.use('*', createAuditMiddleware(dependencies.auditLogger))

  app.onError(createErrorHandler(dependencies.auditLogger))

  const healthRouter = createHealthRouter()
  app.route(API_PREFIX, healthRouter)

  const issueRouter = createIssueRouter({
    createIssue: dependencies.createIssue,
    listIssues: dependencies.listIssues,
    updateIssue: dependencies.updateIssue,
    issueRepository: dependencies.issueRepository,
  })
  app.route(API_PREFIX, issueRouter)

  const commentRouter = createCommentRouter({
    commentRepository: dependencies.commentRepository,
  })
  app.route(API_PREFIX, commentRouter)

  const labelRouter = createLabelRouter({
    issueRepository: dependencies.issueRepository,
  })
  app.route(API_PREFIX, labelRouter)

  const milestoneRouter = createMilestoneRouter({
    getMilestoneOverview: dependencies.getMilestoneOverview,
    createMilestone: dependencies.createMilestone,
  })
  app.route(API_PREFIX, milestoneRouter)

  registerParameterSchemas(app.openAPIRegistry)

  app.doc31('/doc', OPENAPI_CONFIG)

  app.get('/api/docs', apiReference({
    spec: {
      url: '/doc',
    },
    theme: 'default',
    pageTitle: 'Meridian API Docs',
  }))

  return app
}
