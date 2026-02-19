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
import { parseUserId, transformDueDateToDate, unwrapResultOrThrow } from './route-helpers.js'

type IssueRouterDependencies = Pick<
  RestApiDependencies,
  'createIssue' | 'listIssues' | 'updateIssue' | 'deleteIssue' | 'reparentIssue'
> & {
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

const deleteIssueRoute = createRoute({
  method: 'delete',
  path: '/issues/{id}',
  tags: ['Issues'],
  summary: 'Delete an issue',
  request: {
    params: IssueParamsSchema,
  },
  responses: {
    204: {
      description: 'Issue deleted successfully',
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

async function computeChildCount(issueRepository: IIssueRepository, issueId: string): Promise<number> {
  const children = await issueRepository.list(
    { parentId: issueId as IssueId },
    { page: 1, limit: 1 },
  )
  return children.total
}

function serializeIssue(issue: SerializableIssue, childCount: number) {
  return {
    id: issue.id,
    milestoneId: issue.milestoneId,
    title: issue.title,
    description: issue.description,
    state: issue.state as 'open' | 'in_progress' | 'done',
    status: issue.status,
    priority: issue.priority as 'low' | 'normal' | 'high' | 'urgent',
    parentId: issue.parentId,
    childCount,
    assigneeIds: issue.assigneeIds,
    tags: issue.tags,
    dueDate: issue.dueDate?.toISOString() ?? null,
    metadata: issue.metadata,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  }
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
    const childCount = await computeChildCount(dependencies.issueRepository, issue.id)

    return context.json({ data: serializeIssue(issue, childCount) }, 201)
  })

  router.openapi(listIssuesRoute, async (context) => {
    const query = context.req.valid('query')
    const { page, limit, ...filterParams } = query

    const filter: IssueFilterParams = {
      milestoneId: filterParams.milestoneId as MilestoneId | undefined,
      state: filterParams.state,
      status: filterParams.status,
      priority: filterParams.priority,
      parentId: filterParams.parentId as IssueId | null | undefined,
      assigneeId: filterParams.assigneeId as UserId | undefined,
      search: filterParams.search,
    }

    const paginatedResult = await dependencies.listIssues.execute(
      filter,
      { page, limit },
    )

    const { items, total, hasMore } = unwrapResultOrThrow(paginatedResult)

    const serializedItems = await Promise.all(
      items.map(async (issue) => {
        const childCount = await computeChildCount(dependencies.issueRepository, issue.id)
        return serializeIssue(issue, childCount)
      }),
    )

    return context.json({
      data: serializedItems,
      pagination: { page, limit, total, hasMore },
    }, 200)
  })

  router.openapi(getIssueRoute, async (context) => {
    const { id } = context.req.valid('param')

    const issue = await dependencies.issueRepository.getById(id as IssueId)
    const childCount = await computeChildCount(dependencies.issueRepository, issue.id)

    return context.json({ data: serializeIssue(issue, childCount) }, 200)
  })

  router.openapi(updateIssueRoute, async (context) => {
    const { id } = context.req.valid('param')
    const body = context.req.valid('json')
    const userId = parseUserId(context.req.header('X-User-Id'))

    if (body.parentId !== undefined) {
      const reparentResult = await dependencies.reparentIssue.execute(
        id as IssueId,
        body.parentId as IssueId | null,
        userId,
      )
      const reparentedIssue = unwrapResultOrThrow(reparentResult)

      const { parentId: _parentId, ...remainingFields } = body
      const hasRemainingUpdates = Object.keys(remainingFields).length > 0

      if (hasRemainingUpdates) {
        const updateInput = {
          ...remainingFields,
          dueDate: transformDueDateToDate(remainingFields.dueDate),
        }

        const updateResult = await dependencies.updateIssue.execute(id as IssueId, updateInput, userId)
        const updatedIssue = unwrapResultOrThrow(updateResult)
        const childCount = await computeChildCount(dependencies.issueRepository, updatedIssue.id)
        return context.json({ data: serializeIssue(updatedIssue, childCount) }, 200)
      }

      const childCount = await computeChildCount(dependencies.issueRepository, reparentedIssue.id)
      return context.json({ data: serializeIssue(reparentedIssue, childCount) }, 200)
    }

    const input = {
      ...body,
      dueDate: transformDueDateToDate(body.dueDate),
    }

    const result = await dependencies.updateIssue.execute(id as IssueId, input, userId)
    const issue = unwrapResultOrThrow(result)
    const childCount = await computeChildCount(dependencies.issueRepository, issue.id)

    return context.json({ data: serializeIssue(issue, childCount) }, 200)
  })

  router.openapi(deleteIssueRoute, async (context) => {
    const { id } = context.req.valid('param')
    const userId = parseUserId(context.req.header('X-User-Id'))

    const result = await dependencies.deleteIssue.execute(id as IssueId, userId)
    unwrapResultOrThrow(result)

    return context.body(null, 204)
  })

  return router
}
