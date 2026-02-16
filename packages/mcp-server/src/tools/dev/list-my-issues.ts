import type { Issue, Status } from '@meridian/core'
import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { StatusSchema, UserIdSchema } from '@meridian/core'
import { z } from 'zod'

import { formatSuccessResponse, registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { DEV_TAGS } from './constants.js'

const STATUS_DISPLAY_ORDER: readonly Status[] = ['in_progress', 'open', 'closed'] as const

const LIST_MY_ISSUES_INPUT_SCHEMA = z.object({
  assigneeId: UserIdSchema.describe('UUID of the user whose issues to list'),
  status: StatusSchema.optional().describe('Optional status filter: "open", "in_progress", or "closed"'),
  page: z.number().int().positive().default(1).describe('Page number for pagination (default: 1)'),
  limit: z.number().int().positive().max(50).default(20).describe('Number of issues per page, max 50 (default: 20)'),
})

function groupByStatus(issues: Issue[]): Record<string, Issue[]> {
  const grouped: Partial<Record<Status, Issue[]>> = {}

  for (const issue of issues) {
    const statusGroup = grouped[issue.status]
    if (statusGroup) {
      statusGroup.push(issue)
    }
    else {
      grouped[issue.status] = [issue]
    }
  }

  const ordered: Record<string, Issue[]> = {}
  for (const status of STATUS_DISPLAY_ORDER) {
    const items = grouped[status]
    if (items && items.length > 0) {
      ordered[status] = items
    }
  }

  return ordered
}

export function registerListMyIssuesTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'list_my_issues', {
    title: 'List my assigned issues',
    description: [
      'Lists all issues assigned to a specific user, grouped by status with in_progress',
      'issues shown first. Use this to review your current workload, check what tasks are',
      'in flight, and identify what to work on next.',
    ].join(' '),
    inputSchema: LIST_MY_ISSUES_INPUT_SCHEMA.shape,
    tags: DEV_TAGS,
  }, async (args) => {
    const result = await dependencies.listIssues.execute(
      { assigneeId: args.assigneeId, status: args.status },
      { page: args.page, limit: args.limit },
    )

    if (!result.ok) {
      return unwrapResultToMcpResponse(result)
    }

    const grouped = groupByStatus(result.value.items)
    return formatSuccessResponse({
      grouped,
      total: result.value.total,
      page: result.value.page,
      limit: result.value.limit,
      hasMore: result.value.hasMore,
    })
  })
}
