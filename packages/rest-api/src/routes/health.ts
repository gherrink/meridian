import { createRoute, z } from '@hono/zod-openapi'

import { createRouter } from '../router-factory.js'
import { createSuccessResponseSchema } from '../schemas/response-envelope.js'

const HealthDataSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
  version: z.string(),
}).openapi('HealthData')

const HealthResponseSchema = createSuccessResponseSchema(HealthDataSchema)

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'Health check endpoint',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: HealthResponseSchema,
        },
      },
      description: 'Service is healthy',
    },
  },
})

export function createHealthRouter() {
  const router = createRouter()

  router.openapi(healthRoute, (context) => {
    return context.json({
      data: {
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
        version: '0.0.0',
      },
    }, 200)
  })

  return router
}
