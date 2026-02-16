import type { DomainError } from '@meridian/core'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { isDomainError } from '@meridian/core'

export { isDomainError }

export function formatSuccessResponse(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  }
}

export function formatErrorResponse(error: DomainError): CallToolResult {
  return {
    isError: true,
    content: [{
      type: 'text',
      text: JSON.stringify({ code: error.code, message: error.message }),
    }],
  }
}

export function formatUnknownErrorResponse(caughtError?: unknown): CallToolResult {
  if (caughtError !== undefined) {
    const errorDetail = caughtError instanceof Error ? caughtError.message : String(caughtError)
    console.error(`[mcp-server] Unhandled tool error: ${errorDetail}`)
  }
  return {
    isError: true,
    content: [{ type: 'text', text: 'Internal error' }],
  }
}
