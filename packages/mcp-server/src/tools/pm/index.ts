import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { registerAssignPriorityTool } from './assign-priority.js'
import { registerCreateEpicTool } from './create-epic.js'
import { registerCreateMilestoneTool } from './create-milestone.js'
import { registerDeleteIssueTool } from './delete-issue.js'
import { registerListPmMilestonesTool } from './list-milestones.js'
import { registerMilestoneOverviewTool } from './milestone-overview.js'
import { registerReparentIssueTool } from './reparent-issue.js'
import { registerViewRoadmapTool } from './view-roadmap.js'

export function registerPmTools(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): Map<string, RegisteredTool> {
  const tools = new Map<string, RegisteredTool>()

  tools.set('create_epic', registerCreateEpicTool(server, registry, dependencies))
  tools.set('create_milestone', registerCreateMilestoneTool(server, registry, dependencies))
  tools.set('view_roadmap', registerViewRoadmapTool(server, registry, dependencies))
  tools.set('assign_priority', registerAssignPriorityTool(server, registry, dependencies))
  tools.set('list_pm_milestones', registerListPmMilestonesTool(server, registry, dependencies))
  tools.set('milestone_overview', registerMilestoneOverviewTool(server, registry, dependencies))
  tools.set('reparent_issue', registerReparentIssueTool(server, registry, dependencies))
  tools.set('delete_issue', registerDeleteIssueTool(server, registry, dependencies))

  return tools
}
