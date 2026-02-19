import type { CommentId, ICommentRepository, IssueId, UserId } from '@meridian/core'

import { createRoute } from '@hono/zod-openapi'

import { createRouter } from '../router-factory.js'
import {
  CommentIdParamsSchema,
  CommentPaginationQuerySchema,
  CommentParamsSchema,
  CommentResponseSchema,
  CreateCommentBodySchema,
  UpdateCommentBodySchema,
} from '../schemas/comment.js'
import { createPaginatedResponseSchema, createSuccessResponseSchema, ErrorResponseSchema } from '../schemas/response-envelope.js'

interface CommentRouterDependencies {
  commentRepository: ICommentRepository
}

function serializeComment(comment: { id: string, body: string, authorId: string, issueId: string, createdAt: Date, updatedAt: Date }) {
  return {
    id: comment.id,
    body: comment.body,
    authorId: comment.authorId,
    issueId: comment.issueId,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  }
}

const addCommentRoute = createRoute({
  method: 'post',
  path: '/issues/{id}/comments',
  tags: ['Comments'],
  summary: 'Add a comment to an issue',
  request: {
    params: CommentParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: CreateCommentBodySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(CommentResponseSchema),
        },
      },
      description: 'Comment created successfully',
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

const listCommentsRoute = createRoute({
  method: 'get',
  path: '/issues/{id}/comments',
  tags: ['Comments'],
  summary: 'List comments for an issue',
  request: {
    params: CommentParamsSchema,
    query: CommentPaginationQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createPaginatedResponseSchema(CommentResponseSchema),
        },
      },
      description: 'Paginated list of comments',
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

const updateCommentRoute = createRoute({
  method: 'patch',
  path: '/issues/{id}/comments/{commentId}',
  tags: ['Comments'],
  summary: 'Update a comment body',
  request: {
    params: CommentIdParamsSchema,
    body: {
      content: {
        'application/json': {
          schema: UpdateCommentBodySchema,
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(CommentResponseSchema),
        },
      },
      description: 'Comment updated successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Comment not found',
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

const deleteCommentRoute = createRoute({
  method: 'delete',
  path: '/issues/{id}/comments/{commentId}',
  tags: ['Comments'],
  summary: 'Delete a comment',
  request: {
    params: CommentIdParamsSchema,
  },
  responses: {
    204: {
      description: 'Comment deleted successfully',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Comment not found',
    },
  },
})

export function createCommentRouter(dependencies: CommentRouterDependencies) {
  const router = createRouter()

  router.openapi(addCommentRoute, async (context) => {
    const { id: issueId } = context.req.valid('param')
    const body = context.req.valid('json')

    const comment = await dependencies.commentRepository.create({
      body: body.body,
      authorId: body.authorId as UserId,
      issueId: issueId as IssueId,
    })

    return context.json({ data: serializeComment(comment) }, 201)
  })

  router.openapi(listCommentsRoute, async (context) => {
    const { id: issueId } = context.req.valid('param')
    const { page, limit } = context.req.valid('query')

    const result = await dependencies.commentRepository.getByIssueId(
      issueId as IssueId,
      { page, limit },
    )

    return context.json({
      data: result.items.map(serializeComment),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        hasMore: result.hasMore,
      },
    }, 200)
  })

  router.openapi(updateCommentRoute, async (context) => {
    const { commentId } = context.req.valid('param')
    const body = context.req.valid('json')

    const comment = await dependencies.commentRepository.update(commentId as CommentId, body)

    return context.json({ data: serializeComment(comment) }, 200)
  })

  router.openapi(deleteCommentRoute, async (context) => {
    const { commentId } = context.req.valid('param')

    await dependencies.commentRepository.delete(commentId as CommentId)

    return context.body(null, 204)
  })

  return router
}
