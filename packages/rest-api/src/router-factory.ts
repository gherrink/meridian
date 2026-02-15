import type { ErrorResponse } from './schemas/response-envelope.js'

import { OpenAPIHono } from '@hono/zod-openapi'

export function createRouter(): OpenAPIHono {
  return new OpenAPIHono({
    defaultHook: (result, context) => {
      if (!result.success) {
        const firstIssue = result.error.issues[0]
        const fieldPath = firstIssue?.path.join('.') ?? 'unknown'
        const fieldMessage = firstIssue?.message ?? 'Validation failed'

        const errorResponse: ErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Validation failed for '${fieldPath}': ${fieldMessage}`,
            details: result.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          },
        }

        return context.json(errorResponse, 422)
      }
    },
  })
}
