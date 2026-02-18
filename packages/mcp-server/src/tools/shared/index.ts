import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { registerGetIssueTool } from './get-issue.js'
import { registerListMilestonesTool } from './list-milestones.js'
import { registerSearchIssuesTool } from './search-issues.js'

export function registerSharedTools(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): Map<string, RegisteredTool> {
  const tools = new Map<string, RegisteredTool>()

  tools.set('search_issues', registerSearchIssuesTool(server, registry, dependencies))
  tools.set('get_issue', registerGetIssueTool(server, registry, dependencies))
  tools.set('list_milestones', registerListMilestonesTool(server, registry, dependencies))

  return tools
}
