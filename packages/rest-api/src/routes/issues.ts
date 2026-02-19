import type { IIssueRepository, IssueFilterParams, IssueId, MilestoneId, UserId } from '@meridian/core'

import type { RestApiDependencies } from '../types.js'

import { createRoute } from '@hono/zod-openapi'

import { createRouter } from '../router-factory.js'
import {
  CreateIssueBodySchema,
  IssueFilterQuerySchema,
  IssueParamsSchema,
  IssueResponseSchema,
  UpdateIssueBodySchema,
} from '../schemas/issue.js'
import { createPaginatedResponseSchema, createSuccessResponseSchema, ErrorResponseSchema } from '../schemas/response-envelope.js'
import { parseUserId, unwrapResultOrThrow } from './route-helpers.js'

type IssueRouterDependencies = Pick<RestApiDependencies, 'createIssue' | 'listIssues' | 'updateIssue'> & {
  issueRepository: IIssueRepository
}

interface SerializableIssue {
  id: string
  milestoneId: string | null
  title: string
  description: string
  state: string
  status: string
  priority: string
  parentId: string | null
  assigneeIds: string[]
  tags: Array<{ id: string, name: string, color: string | null }>
  dueDate: Date | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const createIssueRoute = createRoute({
  method: 'post',
  path: '/issues',
  tags: ['Issues'],
  summary: 'Create a new issue',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateIssueBodySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(IssueResponseSchema),
        },
      },
      description: 'Issue created successfully',
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

const listIssuesRoute = createRoute({
  method: 'get',
  path: '/issues',
  tags: ['Issues'],
  summary: 'List issues with optional filtering and pagination',
  request: {
    query: IssueFilterQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createPaginatedResponseSchema(IssueResponseSchema),
        },
      },
      description: 'Paginated list of issues',
    },
  },
})

const getIssueRoute = createRoute({
  method: 'get',
  path: '/issues/{id}',
  tags: ['Issues'],
  summary: 'Get a single issue by ID',
  request: {
    params: IssueParamsSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(IssueResponseSchema),
        },
      },
      description: 'Issue found',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Issue not found',
    },
  },
})

const updateIssueRoute = createRoute({
  method: 'patch',
  path: '/issues/{id}',
  tags: ['Issues'],
  summary: 'Partially update an issue',
  request: {
    params: IssueParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateIssueBodySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(IssueResponseSchema),
        },
      },
      description: 'Issue updated successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Issue not found',
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

function serializeIssue(issue: SerializableIssue) {
  return {
    id: issue.id,
    milestoneId: issue.milestoneId,
    title: issue.title,
    description: issue.description,
    state: issue.state as 'open' | 'in_progress' | 'done',
    status: issue.status,
    priority: issue.priority as 'low' | 'normal' | 'high' | 'urgent',
    parentId: issue.parentId,
    assigneeIds: issue.assigneeIds,
    tags: issue.tags,
    dueDate: issue.dueDate?.toISOString() ?? null,
    metadata: issue.metadata,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  }
}

function transformDueDateToDate(dueDate: string | null | undefined): Date | null | undefined {
  if (dueDate === undefined) {
    return undefined
  }
  return dueDate === null ? null : new Date(dueDate)
}

export function createIssueRouter(dependencies: IssueRouterDependencies) {
  const router = createRouter()

  router.openapi(createIssueRoute, async (context) => {
    const body = context.req.valid('json')
    const userId = parseUserId(context.req.header('X-User-Id'))

    const input = {
      ...body,
      dueDate: transformDueDateToDate(body.dueDate),
    }

    const result = await dependencies.createIssue.execute(input, userId)
    const issue = unwrapResultOrThrow(result)

    return context.json({ data: serializeIssue(issue) }, 201)
  })

  router.openapi(listIssuesRoute, async (context) => {
    const query = context.req.valid('query')
    const { page, limit, ...filterParams } = query

    const filter: IssueFilterParams = {
      milestoneId: filterParams.milestoneId as MilestoneId | undefined,
      state: filterParams.state,
      status: filterParams.status,
      priority: filterParams.priority,
      assigneeId: filterParams.assigneeId as UserId | undefined,
      search: filterParams.search,
    }

    const paginatedResult = await dependencies.listIssues.execute(
      filter,
      { page, limit },
    )

    const { items, total, hasMore } = unwrapResultOrThrow(paginatedResult)

    return context.json({
      data: items.map(serializeIssue),
      pagination: { page, limit, total, hasMore },
    }, 200)
  })

  router.openapi(getIssueRoute, async (context) => {
    const { id } = context.req.valid('param')
    const issue = await dependencies.issueRepository.getById(id as IssueId)
    return context.json({ data: serializeIssue(issue) }, 200)
  })

  router.openapi(updateIssueRoute, async (context) => {
    const { id } = context.req.valid('param')
    const body = context.req.valid('json')
    const userId = parseUserId(context.req.header('X-User-Id'))

    const input = {
      ...body,
      dueDate: transformDueDateToDate(body.dueDate),
    }

    const result = await dependencies.updateIssue.execute(id as IssueId, input, userId)
    const issue = unwrapResultOrThrow(result)

    return context.json({ data: serializeIssue(issue) }, 200)
  })

  return router
}
