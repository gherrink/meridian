import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { ProjectIdSchema } from '@meridian/core'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { PM_TAGS } from './constants.js'

export function registerProjectOverviewTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'project_overview', {
    title: 'Get project status overview',
    description: [
      'Returns a comprehensive status snapshot of a project, including total issue count',
      'and a breakdown by status (open, in progress, closed).',
      'Use this for daily stand-ups, status reports, or when a PM needs a quick health check',
      'on a project. Shows how many issues are in each state so you can spot bottlenecks',
      'or stalled work at a glance.',
    ].join(' '),
    inputSchema: { projectId: ProjectIdSchema.describe('UUID of the project to get an overview for') },
    tags: PM_TAGS,
  }, async (args) => {
    const result = await dependencies.getProjectOverview.execute(args.projectId)
    return unwrapResultToMcpResponse(result)
  })
}
