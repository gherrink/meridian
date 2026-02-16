import type { RestApiDependencies } from './types.js'

import { requestId } from 'hono/request-id'

import { createAuditMiddleware, createCorsMiddleware, createErrorHandler } from './middleware/index.js'
import { createRouter } from './router-factory.js'
import { createCommentRouter } from './routes/comments.js'
import { createHealthRouter } from './routes/health.js'
import { createIssueRouter } from './routes/issues.js'
import { createLabelRouter } from './routes/labels.js'
import { createProjectRouter } from './routes/projects.js'

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

  const projectRouter = createProjectRouter({
    getProjectOverview: dependencies.getProjectOverview,
  })
  app.route(API_PREFIX, projectRouter)

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
