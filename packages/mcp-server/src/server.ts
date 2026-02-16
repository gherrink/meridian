import type { RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { McpServerConfig, McpServerDependencies } from './types.js'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { resolveVisibleTools } from './helpers/resolve-visible-tools.js'
import { ToolTagRegistry } from './helpers/tool-tag-registry.js'
import { registerDevTools } from './tools/dev/index.js'
import { registerHealthTool } from './tools/health.js'
import { registerPmTools } from './tools/pm/index.js'

const DEFAULT_SERVER_NAME = 'meridian'
const DEFAULT_SERVER_VERSION = '0.0.0'

export function createMcpServer(dependencies: McpServerDependencies, config?: McpServerConfig): McpServer {
  const name = config?.name ?? DEFAULT_SERVER_NAME
  const version = config?.version ?? DEFAULT_SERVER_VERSION

  const server = new McpServer({ name, version })
  const registry = new ToolTagRegistry()
  const registeredTools = new Map<string, RegisteredTool>()

  registeredTools.set('health_check', registerHealthTool(server, registry, version))

  const pmTools = registerPmTools(server, registry, dependencies)
  for (const [toolName, registeredTool] of pmTools) {
    registeredTools.set(toolName, registeredTool)
  }

  const devTools = registerDevTools(server, registry, dependencies)
  for (const [toolName, registeredTool] of devTools) {
    registeredTools.set(toolName, registeredTool)
  }

  applyTagFilters(registeredTools, registry, config)

  return server
}

function applyTagFilters(
  registeredTools: Map<string, RegisteredTool>,
  registry: ToolTagRegistry,
  config?: McpServerConfig,
): void {
  const hasInclude = config?.includeTags !== undefined && config.includeTags.size > 0
  const hasExclude = config?.excludeTags !== undefined && config.excludeTags.size > 0

  if (!hasInclude && !hasExclude) {
    return
  }

  const allToolNames = [...registeredTools.keys()]
  const visibleNames = resolveVisibleTools(allToolNames, registry.getAll(), {
    includeTags: config?.includeTags,
    excludeTags: config?.excludeTags,
  })

  for (const [toolName, registeredTool] of registeredTools) {
    if (!visibleNames.has(toolName)) {
      registeredTool.disable()
    }
  }
}
