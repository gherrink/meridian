import type { McpServerConfig, McpServerDependencies } from './types.js'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerHealthTool } from './tools/health.js'

const DEFAULT_SERVER_NAME = 'meridian'
const DEFAULT_SERVER_VERSION = '0.0.0'

export function createMcpServer(_dependencies: McpServerDependencies, config?: McpServerConfig): McpServer {
  const name = config?.name ?? DEFAULT_SERVER_NAME
  const version = config?.version ?? DEFAULT_SERVER_VERSION

  const server = new McpServer({ name, version })

  registerHealthTool(server, version)

  return server
}
