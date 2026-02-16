import type { ProjectId } from '@meridian/core'

import type { RestApiDependencies } from '../types.js'

import { createRoute } from '@hono/zod-openapi'

import { createRouter } from '../router-factory.js'
import { ProjectOverviewParamsSchema, ProjectOverviewResponseSchema } from '../schemas/project-overview.js'
import { createSuccessResponseSchema, ErrorResponseSchema } from '../schemas/response-envelope.js'

type ProjectRouterDependencies = Pick<RestApiDependencies, 'getProjectOverview'>

const getProjectOverviewRoute = createRoute({
  method: 'get',
  path: '/projects/{id}/overview',
  tags: ['Projects'],
  summary: 'Get project overview with status breakdown',
  request: {
    params: ProjectOverviewParamsSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(ProjectOverviewResponseSchema),
        },
      },
      description: 'Project overview with issue status breakdown',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Project not found',
    },
  },
})

function serializeProjectOverview(overview: { project: { id: string, name: string, description: string, metadata: Record<string, unknown>, createdAt: Date, updatedAt: Date }, totalIssues: number, statusBreakdown: Record<string, number> }) {
  return {
    project: {
      id: overview.project.id,
      name: overview.project.name,
      description: overview.project.description,
      metadata: overview.project.metadata,
      createdAt: overview.project.createdAt.toISOString(),
      updatedAt: overview.project.updatedAt.toISOString(),
    },
    totalIssues: overview.totalIssues,
    statusBreakdown: overview.statusBreakdown as { open: number, in_progress: number, closed: number },
  }
}

export function createProjectRouter(dependencies: ProjectRouterDependencies) {
  const router = createRouter()

  router.openapi(getProjectOverviewRoute, async (context) => {
    const { id } = context.req.valid('param')

    const result = await dependencies.getProjectOverview.execute(id as ProjectId)

    if (!result.ok) {
      throw result.error
    }

    return context.json({ data: serializeProjectOverview(result.value) }, 200)
  })

  return router
}
