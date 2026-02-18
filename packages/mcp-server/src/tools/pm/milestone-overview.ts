import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { MilestoneIdSchema } from '@meridian/core'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { PM_TAGS } from './constants.js'

export function registerMilestoneOverviewTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'milestone_overview', {
    title: 'Get milestone status overview',
    description: [
      'Best for detailed status reports.',
      'Returns a comprehensive status snapshot of a milestone, including the full milestone',
      'entity with all metadata plus issue counts by status (open, in progress, closed).',
      'Use this for daily stand-ups, status reports, or when a PM needs a quick health check',
      'on a milestone. Shows how many issues are in each state so you can spot bottlenecks',
      'or stalled work at a glance.',
      'For a quick completion percentage, use view_roadmap instead.',
    ].join(' '),
    inputSchema: { milestoneId: MilestoneIdSchema.describe('UUID of the milestone to get an overview for') },
    tags: PM_TAGS,
  }, async (args) => {
    const result = await dependencies.getMilestoneOverview.execute(args.milestoneId)
    return unwrapResultToMcpResponse(result)
  })
}
