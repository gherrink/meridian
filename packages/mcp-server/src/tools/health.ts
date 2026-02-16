import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { z } from 'zod'

import { formatSuccessResponse, registerTool } from '../helpers/index.js'

const HEALTH_CHECK_INPUT_SCHEMA = z.object({})

export function registerHealthTool(server: McpServer, version: string): void {
  registerTool(server, 'health_check', {
    title: 'Check server health status',
    description: 'Returns the current health status of the Meridian MCP server, including uptime and version information.',
    inputSchema: HEALTH_CHECK_INPUT_SCHEMA.shape,
  }, async () => {
    return formatSuccessResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version,
    })
  })
}
