import type { ErrorResponse } from '../schemas/response-envelope.js'

import { DomainError } from '@meridian/core'

const DOMAIN_ERROR_CODE_TO_HTTP_STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  CONFLICT: 409,
  AUTHORIZATION_ERROR: 401,
  RATE_LIMITED: 429,
}

const DEFAULT_HTTP_STATUS = 500

export function mapDomainErrorToStatus(error: DomainError): number {
  return DOMAIN_ERROR_CODE_TO_HTTP_STATUS[error.code] ?? DEFAULT_HTTP_STATUS
}

export function formatErrorResponse(error: DomainError): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
    },
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError
}
