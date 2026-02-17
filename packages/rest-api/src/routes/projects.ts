import type { Project, ProjectId } from '@meridian/core'

import type { RestApiDependencies } from '../types.js'

import { createRoute } from '@hono/zod-openapi'

import { createRouter } from '../router-factory.js'
import { CreateProjectBodySchema, ProjectOverviewParamsSchema, ProjectOverviewResponseSchema, ProjectResponseSchema } from '../schemas/project-overview.js'
import { createSuccessResponseSchema, ErrorResponseSchema } from '../schemas/response-envelope.js'
import { parseUserId, unwrapResultOrThrow } from './route-helpers.js'

type ProjectRouterDependencies = Pick<RestApiDependencies, 'getProjectOverview' | 'createProject'>

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

const createProjectRoute = createRoute({
  method: 'post',
  path: '/projects',
  tags: ['Projects'],
  summary: 'Create a new project',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateProjectBodySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(ProjectResponseSchema),
        },
      },
      description: 'Project created successfully',
    },
    422: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Validation error',
    },
  },
})

function serializeProject(project: Project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    metadata: project.metadata,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }
}

function serializeProjectOverview(overview: { project: Project, totalIssues: number, statusBreakdown: Record<string, number> }) {
  return {
    project: serializeProject(overview.project),
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

  router.openapi(createProjectRoute, async (context) => {
    const body = context.req.valid('json')
    const userId = parseUserId(context.req.header('X-User-Id'))

    const result = await dependencies.createProject.execute(body, userId)
    const project = unwrapResultOrThrow(result)

    return context.json({ data: serializeProject(project) }, 201)
  })

  return router
}
