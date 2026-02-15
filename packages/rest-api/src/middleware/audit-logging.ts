import type { IAuditLogger, UserId } from '@meridian/core'
import type { MiddlewareHandler } from 'hono'

const SYSTEM_USER_ID = 'system' as UserId

export function createAuditMiddleware(logger: IAuditLogger): MiddlewareHandler {
  return async (context, next) => {
    const startTime = Date.now()

    await next()

    const durationMs = Date.now() - startTime
    const { method } = context.req
    const path = context.req.path
    const status = context.res.status

    try {
      await logger.log('HttpRequest', SYSTEM_USER_ID, {
        method,
        path,
        status,
        durationMs,
      })
    }
    catch {
      // Fire-and-forget: do not block the request if audit logging fails
      console.error(`Audit logging failed for ${method} ${path}`)
    }
  }
}
