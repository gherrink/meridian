import type { MiddlewareHandler } from 'hono'

import { cors } from 'hono/cors'

const DEFAULT_CORS_ORIGINS = ['*']

export function createCorsMiddleware(origins?: string[]): MiddlewareHandler {
  return cors({
    origin: origins ?? DEFAULT_CORS_ORIGINS,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-Request-Id'],
    maxAge: 86400,
  })
}
