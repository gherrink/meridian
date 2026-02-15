import type { IAuditLogger, UserId } from '@meridian/core'
import type { ErrorHandler } from 'hono'
import type { StatusCode } from 'hono/utils/http-status'

import type { ErrorResponse } from '../schemas/response-envelope.js'

import { formatErrorResponse, isDomainError, mapDomainErrorToStatus } from './error-mapper.js'

const SYSTEM_USER_ID = 'system' as UserId

export function createErrorHandler(auditLogger: IAuditLogger): ErrorHandler {
  return (error, context) => {
    if (isDomainError(error)) {
      const status = mapDomainErrorToStatus(error) as StatusCode
      const body = formatErrorResponse(error)
      return context.json(body, status)
    }

    try {
      void auditLogger.log('UnexpectedError', SYSTEM_USER_ID, {
        message: error instanceof Error ? error.message : String(error),
        path: context.req.path,
        method: context.req.method,
      })
    }
    catch {
      console.error('Failed to audit-log unexpected error:', error)
    }

    const unexpectedErrorBody: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    }

    return context.json(unexpectedErrorBody, 500)
  }
}
