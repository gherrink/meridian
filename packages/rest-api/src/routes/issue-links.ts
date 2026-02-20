import type { IssueId, IssueLinkId } from '@meridian/core'

import type { RestApiDependencies } from '../types.js'

import { createRoute } from '@hono/zod-openapi'

import { createRouter } from '../router-factory.js'
import {
  CreateIssueLinkBodySchema,
  IssueLinkParamsSchema,
  IssueLinkResponseSchema,
  IssueLinksQuerySchema,
  ResolvedIssueLinkResponseSchema,
} from '../schemas/issue-link.js'
import { IssueParamsSchema } from '../schemas/issue.js'
import { createSuccessResponseSchema, ErrorResponseSchema } from '../schemas/response-envelope.js'
import { unwrapResultOrThrow } from './route-helpers.js'

type IssueLinkRouterDependencies = Pick<
  RestApiDependencies,
  'createIssueLink' | 'listIssueLinks' | 'deleteIssueLink'
>

const createIssueLinkRoute = createRoute({
  method: 'post',
  path: '/issues/{id}/links',
  tags: ['Issue Links'],
  summary: 'Create a link from this issue to another',
  request: {
    params: IssueParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: CreateIssueLinkBodySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(IssueLinkResponseSchema),
        },
      },
      description: 'Issue link created successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Issue not found',
    },
    409: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Link already exists',
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

const listIssueLinksRoute = createRoute({
  method: 'get',
  path: '/issues/{id}/links',
  tags: ['Issue Links'],
  summary: 'List all links for an issue',
  request: {
    params: IssueParamsSchema,
    query: IssueLinksQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(ResolvedIssueLinkResponseSchema.array()),
        },
      },
      description: 'List of resolved issue links',
    },
  },
})

const deleteIssueLinkRoute = createRoute({
  method: 'delete',
  path: '/issue-links/{id}',
  tags: ['Issue Links'],
  summary: 'Delete an issue link',
  request: {
    params: IssueLinkParamsSchema,
  },
  responses: {
    204: {
      description: 'Issue link deleted successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Issue link not found',
    },
  },
})

export function createIssueLinkRouter(dependencies: IssueLinkRouterDependencies) {
  const router = createRouter()

  router.openapi(createIssueLinkRoute, async (context) => {
    const { id } = context.req.valid('param')
    const body = context.req.valid('json')

    const result = await dependencies.createIssueLink.execute({
      sourceIssueId: id as IssueId,
      targetIssueId: body.targetIssueId,
      type: body.type,
    })

    const link = unwrapResultOrThrow(result)

    return context.json({
      data: {
        id: link.id,
        sourceIssueId: link.sourceIssueId,
        targetIssueId: link.targetIssueId,
        type: link.type,
        createdAt: link.createdAt.toISOString(),
      },
    }, 201)
  })

  router.openapi(listIssueLinksRoute, async (context) => {
    const { id } = context.req.valid('param')
    const query = context.req.valid('query')

    const filter = query.type !== undefined ? { type: query.type } : undefined
    const result = await dependencies.listIssueLinks.execute(id as IssueId, filter)
    const resolvedLinks = unwrapResultOrThrow(result)

    const serializedLinks = resolvedLinks.map(link => ({
      id: link.id,
      linkedIssueId: link.linkedIssueId,
      type: link.type,
      label: link.label,
      direction: link.direction,
      createdAt: link.createdAt.toISOString(),
    }))

    return context.json({ data: serializedLinks }, 200)
  })

  router.openapi(deleteIssueLinkRoute, async (context) => {
    const { id } = context.req.valid('param')

    const result = await dependencies.deleteIssueLink.execute(id as IssueLinkId)
    unwrapResultOrThrow(result)

    return context.body(null, 204)
  })

  return router
}
