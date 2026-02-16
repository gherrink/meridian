import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'

import type { ToolTagRegistry } from '../helpers/tool-tag-registry.js'

import { z } from 'zod'

import { formatSuccessResponse, registerTool } from '../helpers/index.js'

const HEALTH_CHECK_INPUT_SCHEMA = z.object({})

export function registerHealthTool(server: McpServer, registry: ToolTagRegistry, version: string): RegisteredTool {
  return registerTool(server, registry, 'health_check', {
    title: 'Check server health status',
    description: 'Returns the current health status of the Meridian MCP server, including uptime and version information.',
    inputSchema: HEALTH_CHECK_INPUT_SCHEMA.shape,
    tags: new Set(['shared']),
  }, async () => {
    return formatSuccessResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version,
    })
  })
}
