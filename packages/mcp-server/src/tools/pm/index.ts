import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { registerAssignPriorityTool } from './assign-priority.js'
import { registerCreateEpicTool } from './create-epic.js'
import { registerCreateProjectTool } from './create-project.js'
import { registerListMilestonesTool } from './list-milestones.js'
import { registerProjectOverviewTool } from './project-overview.js'
import { registerViewRoadmapTool } from './view-roadmap.js'

export function registerPmTools(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): Map<string, RegisteredTool> {
  const tools = new Map<string, RegisteredTool>()

  tools.set('create_epic', registerCreateEpicTool(server, registry, dependencies))
  tools.set('create_project', registerCreateProjectTool(server, registry, dependencies))
  tools.set('view_roadmap', registerViewRoadmapTool(server, registry, dependencies))
  tools.set('assign_priority', registerAssignPriorityTool(server, registry, dependencies))
  tools.set('list_milestones', registerListMilestonesTool(server, registry, dependencies))
  tools.set('project_overview', registerProjectOverviewTool(server, registry, dependencies))

  return tools
}
