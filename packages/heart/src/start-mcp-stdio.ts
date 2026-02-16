import type { McpServerConfig, McpServerDependencies } from '@meridian/mcp-server'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { createMcpServer } from '@meridian/mcp-server'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

export interface McpStdioHandle {
  server: McpServer
  transport: StdioServerTransport
}

export async function startMcpStdio(
  dependencies: McpServerDependencies,
  config?: McpServerConfig,
): Promise<McpStdioHandle> {
  const transport = new StdioServerTransport()
  const server = createMcpServer(dependencies, config)

  await server.connect(transport)

  return { server, transport }
}
