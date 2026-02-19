import type { IUserRepository, User, UserId } from '@meridian/core'

import { createRoute } from '@hono/zod-openapi'

import { createRouter } from '../router-factory.js'
import { createPaginatedResponseSchema, createSuccessResponseSchema, ErrorResponseSchema } from '../schemas/response-envelope.js'
import { UserParamsSchema, UserResponseSchema, UserSearchQuerySchema } from '../schemas/user.js'

interface UserRouterDependencies {
  userRepository: IUserRepository
}

function serializeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  }
}

const listUsersRoute = createRoute({
  method: 'get',
  path: '/users',
  tags: ['Users'],
  summary: 'Search users by name or email',
  request: {
    query: UserSearchQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createPaginatedResponseSchema(UserResponseSchema),
        },
      },
      description: 'Paginated list of users',
    },
  },
})

const getCurrentUserRoute = createRoute({
  method: 'get',
  path: '/users/me',
  tags: ['Users'],
  summary: 'Get the currently authenticated user',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(UserResponseSchema),
        },
      },
      description: 'Current user',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Not authenticated',
    },
  },
})

const getUserRoute = createRoute({
  method: 'get',
  path: '/users/{id}',
  tags: ['Users'],
  summary: 'Get a user by ID',
  request: {
    params: UserParamsSchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(UserResponseSchema),
        },
      },
      description: 'User found',
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'User not found',
    },
  },
})

export function createUserRouter(dependencies: UserRouterDependencies) {
  const router = createRouter()

  router.openapi(listUsersRoute, async (context) => {
    const { query, page, limit } = context.req.valid('query')

    const result = await dependencies.userRepository.search(query, { page, limit })

    return context.json({
      data: result.items.map(serializeUser),
      pagination: {
        page,
        limit,
        total: result.total,
        hasMore: result.hasMore,
      },
    }, 200)
  })

  // Register /users/me before /users/{id} so the literal path is matched first
  // and "me" is not captured as a UUID param (which would fail Zod validation).
  router.openapi(getCurrentUserRoute, async (context) => {
    const user = await dependencies.userRepository.getCurrent()

    return context.json({ data: serializeUser(user) }, 200)
  })

  router.openapi(getUserRoute, async (context) => {
    const { id } = context.req.valid('param')

    const user = await dependencies.userRepository.getById(id as UserId)

    return context.json({ data: serializeUser(user) }, 200)
  })

  return router
}
