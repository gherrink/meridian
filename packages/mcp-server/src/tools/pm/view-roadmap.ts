import type { ProjectOverview } from '@meridian/core'
import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'

import type { McpServerDependencies } from '../../types.js'
import { ProjectIdSchema } from '@meridian/core'

import { formatSuccessResponse, registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { PM_TAGS } from './constants.js'

interface RoadmapSummary {
  projectName: string
  totalIssues: number
  completedIssues: number
  completionPercentage: number
  statusBreakdown: Record<string, number>
}

function formatAsRoadmapSummary(overview: ProjectOverview): RoadmapSummary {
  const completedIssues = overview.statusBreakdown.closed ?? 0
  const completionPercentage = overview.totalIssues > 0
    ? Math.round((completedIssues / overview.totalIssues) * 100)
    : 0

  return {
    projectName: overview.project.name,
    totalIssues: overview.totalIssues,
    completedIssues,
    completionPercentage,
    statusBreakdown: overview.statusBreakdown,
  }
}

export function registerViewRoadmapTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'view_roadmap', {
    title: 'View project roadmap',
    description: [
      'Best for high-level progress tracking.',
      'Returns the roadmap for a project, showing milestone progress and how issues',
      'are distributed across statuses (open, in progress, closed).',
      'Returns completion percentage and status distribution.',
      'Use this when a PM wants to see the big picture of a project: how much work',
      'is done, what is in flight, and what remains. Helpful for sprint planning,',
      'stakeholder updates, and release readiness checks.',
      'For raw issue counts and full project data, use project_overview instead.',
    ].join(' '),
    inputSchema: { projectId: ProjectIdSchema.describe('UUID of the project to view the roadmap for') },
    tags: PM_TAGS,
  }, async (args) => {
    const result = await dependencies.getProjectOverview.execute(args.projectId)
    if (!result.ok) {
      return unwrapResultToMcpResponse(result)
    }
    return formatSuccessResponse(formatAsRoadmapSummary(result.value))
  })
}
