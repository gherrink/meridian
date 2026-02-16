import type { Result } from '@meridian/core'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import { formatErrorResponse, formatSuccessResponse } from './format-response.js'

export function unwrapResultToMcpResponse<T>(result: Result<T>): CallToolResult {
  if (result.ok) {
    return formatSuccessResponse(result.value)
  }
  return formatErrorResponse(result.error)
}
