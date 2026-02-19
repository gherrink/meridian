import type { IMilestoneRepository, Milestone, MilestoneId } from '@meridian/core'

import type { RestApiDependencies } from '../types.js'

import { createRoute } from '@hono/zod-openapi'
import { NotFoundError } from '@meridian/core'

import { createRouter } from '../router-factory.js'
import {
  CreateMilestoneBodySchema,
  MilestoneOverviewResponseSchema,
  MilestonePaginationQuerySchema,
  MilestoneParamsSchema,
  MilestoneResponseSchema,
  UpdateMilestoneBodySchema,
} from '../schemas/milestone.js'
import { createPaginatedResponseSchema, createSuccessResponseSchema, ErrorResponseSchema } from '../schemas/response-envelope.js'
import { parseUserId, transformDueDateToDate, unwrapResultOrThrow } from './route-helpers.js'

type MilestoneRouterDependencies = Pick<
  RestApiDependencies,
  'getMilestoneOverview' | 'createMilestone' | 'listMilestones' | 'updateMilestone' | 'deleteMilestone'
> & {
  milestoneRepository: IMilestoneRepository
}

const listMilestonesRoute = createRoute({
  method: 'get',
  path: '/milestones',
  tags: ['Milestones'],
  summary: 'List milestones with pagination',
  request: {
    query: MilestonePaginationQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createPaginatedResponseSchema(MilestoneResponseSchema),
        },
      },
      description: 'Paginated list of milestones',
    },
  },
})

const getMilestoneRoute = createRoute({
  method: 'get',
  path: '/milestones/{id}',
  tags: ['Milestones'],
  summary: 'Get a single milestone by ID',
  request: {
    params: MilestoneParamsSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(MilestoneResponseSchema),
        },
      },
      description: 'Milestone found',
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

const getMilestoneOverviewRoute = createRoute({
  method: 'get',
  path: '/milestones/{id}/overview',
  tags: ['Milestones'],
  summary: 'Get milestone overview with state breakdown',
  request: {
    params: MilestoneParamsSchema,
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

const updateMilestoneRoute = createRoute({
  method: 'patch',
  path: '/milestones/{id}',
  tags: ['Milestones'],
  summary: 'Partially update a milestone',
  request: {
    params: MilestoneParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateMilestoneBodySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(MilestoneResponseSchema),
        },
      },
      description: 'Milestone updated successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Milestone not found',
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

const deleteMilestoneRoute = createRoute({
  method: 'delete',
  path: '/milestones/{id}',
  tags: ['Milestones'],
  summary: 'Delete a milestone',
  request: {
    params: MilestoneParamsSchema,
  },
  responses: {
    204: {
      description: 'Milestone deleted successfully',
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

async function fetchMilestoneById(milestoneRepository: IMilestoneRepository, id: MilestoneId): Promise<Milestone> {
  try {
    return await milestoneRepository.getById(id)
  }
  catch (error) {
    if (error instanceof NotFoundError) {
      throw error
    }
    throw error
  }
}

export function createMilestoneRouter(dependencies: MilestoneRouterDependencies) {
  const router = createRouter()

  router.openapi(listMilestonesRoute, async (context) => {
    const { page, limit } = context.req.valid('query')

    const result = await dependencies.listMilestones.execute({ page, limit })
    const { items, total, hasMore } = unwrapResultOrThrow(result)

    return context.json({
      data: items.map(serializeMilestone),
      pagination: { page, limit, total, hasMore },
    }, 200)
  })

  router.openapi(getMilestoneRoute, async (context) => {
    const { id } = context.req.valid('param')

    const milestone = await fetchMilestoneById(dependencies.milestoneRepository, id as MilestoneId)

    return context.json({ data: serializeMilestone(milestone) }, 200)
  })

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

    const input = {
      ...body,
      dueDate: transformDueDateToDate(body.dueDate),
    }

    const result = await dependencies.createMilestone.execute(input, userId)
    const milestone = unwrapResultOrThrow(result)

    return context.json({ data: serializeMilestone(milestone) }, 201)
  })

  router.openapi(updateMilestoneRoute, async (context) => {
    const { id } = context.req.valid('param')
    const body = context.req.valid('json')
    const userId = parseUserId(context.req.header('X-User-Id'))

    const input = {
      ...body,
      dueDate: transformDueDateToDate(body.dueDate),
    }

    const result = await dependencies.updateMilestone.execute(id as MilestoneId, input, userId)
    const milestone = unwrapResultOrThrow(result)

    return context.json({ data: serializeMilestone(milestone) }, 200)
  })

  router.openapi(deleteMilestoneRoute, async (context) => {
    const { id } = context.req.valid('param')
    const userId = parseUserId(context.req.header('X-User-Id'))

    const result = await dependencies.deleteMilestone.execute(id as MilestoneId, userId)
    unwrapResultOrThrow(result)

    return context.body(null, 204)
  })

  return router
}
