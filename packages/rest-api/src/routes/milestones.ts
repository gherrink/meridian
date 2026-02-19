import type { Milestone, MilestoneId } from '@meridian/core'

import type { RestApiDependencies } from '../types.js'

import { createRoute } from '@hono/zod-openapi'

import { createRouter } from '../router-factory.js'
import { CreateMilestoneBodySchema, MilestoneOverviewParamsSchema, MilestoneOverviewResponseSchema, MilestoneResponseSchema } from '../schemas/milestone-overview.js'
import { createSuccessResponseSchema, ErrorResponseSchema } from '../schemas/response-envelope.js'
import { parseUserId, unwrapResultOrThrow } from './route-helpers.js'

type MilestoneRouterDependencies = Pick<RestApiDependencies, 'getMilestoneOverview' | 'createMilestone'>

const getMilestoneOverviewRoute = createRoute({
  method: 'get',
  path: '/milestones/{id}/overview',
  tags: ['Milestones'],
  summary: 'Get milestone overview with state breakdown',
  request: {
    params: MilestoneOverviewParamsSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(MilestoneOverviewResponseSchema),
        },
      },
      description: 'Milestone overview with issue state breakdown',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Milestone not found',
    },
  },
})

const createMilestoneRoute = createRoute({
  method: 'post',
  path: '/milestones',
  tags: ['Milestones'],
  summary: 'Create a new milestone',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateMilestoneBodySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(MilestoneResponseSchema),
        },
      },
      description: 'Milestone created successfully',
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

function serializeMilestone(milestone: Milestone) {
  return {
    id: milestone.id,
    name: milestone.name,
    description: milestone.description,
    status: milestone.status,
    dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : null,
    metadata: milestone.metadata,
    createdAt: milestone.createdAt.toISOString(),
    updatedAt: milestone.updatedAt.toISOString(),
  }
}

function serializeMilestoneOverview(overview: { milestone: Milestone, totalIssues: number, stateBreakdown: Record<string, number> }) {
  return {
    milestone: serializeMilestone(overview.milestone),
    totalIssues: overview.totalIssues,
    stateBreakdown: overview.stateBreakdown as { open: number, in_progress: number, done: number },
  }
}

export function createMilestoneRouter(dependencies: MilestoneRouterDependencies) {
  const router = createRouter()

  router.openapi(getMilestoneOverviewRoute, async (context) => {
    const { id } = context.req.valid('param')

    const result = await dependencies.getMilestoneOverview.execute(id as MilestoneId)

    if (!result.ok) {
      throw result.error
    }

    return context.json({ data: serializeMilestoneOverview(result.value) }, 200)
  })

  router.openapi(createMilestoneRoute, async (context) => {
    const body = context.req.valid('json')
    const userId = parseUserId(context.req.header('X-User-Id'))

    const result = await dependencies.createMilestone.execute(body, userId)
    const milestone = unwrapResultOrThrow(result)

    return context.json({ data: serializeMilestone(milestone) }, 201)
  })

  return router
}
