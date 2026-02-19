import type { Issue, State } from '@meridian/core'
import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { StateSchema, UserIdSchema } from '@meridian/core'
import { z } from 'zod'

import { formatSuccessResponse, registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { DEV_TAGS } from './constants.js'

const STATE_DISPLAY_ORDER: readonly State[] = ['in_progress', 'open', 'done'] as const

const LIST_MY_ISSUES_INPUT_SCHEMA = z.object({
  assigneeId: UserIdSchema.describe('UUID of the user whose issues to list'),
  state: StateSchema.optional().describe('Optional state filter: "open", "in_progress", or "done"'),
  page: z.number().int().positive().default(1).describe('Page number for pagination (default: 1)'),
  limit: z.number().int().positive().max(50).default(20).describe('Number of issues per page, max 50 (default: 20)'),
})

function groupByState(issues: Issue[]): Record<string, Issue[]> {
  const grouped: Partial<Record<State, Issue[]>> = {}

  for (const issue of issues) {
    const stateGroup = grouped[issue.state]
    if (stateGroup) {
      stateGroup.push(issue)
    }
    else {
      grouped[issue.state] = [issue]
    }
  }

  const ordered: Record<string, Issue[]> = {}
  for (const state of STATE_DISPLAY_ORDER) {
    const items = grouped[state]
    if (items && items.length > 0) {
      ordered[state] = items
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
      'Lists all issues assigned to a specific user, grouped by state with in_progress',
      'issues shown first. Use this to review your current workload, check what tasks are',
      'in flight, and identify what to work on next.',
      'For broader cross-project search with text matching, use search_issues instead.',
    ].join(' '),
    inputSchema: LIST_MY_ISSUES_INPUT_SCHEMA.shape,
    tags: DEV_TAGS,
  }, async (args) => {
    const result = await dependencies.listIssues.execute(
      { assigneeId: args.assigneeId, state: args.state },
      { page: args.page, limit: args.limit },
    )

    if (!result.ok) {
      return unwrapResultToMcpResponse(result)
    }

    const grouped = groupByState(result.value.items)
    return formatSuccessResponse({
      grouped,
      total: result.value.total,
      page: result.value.page,
      limit: result.value.limit,
      hasMore: result.value.hasMore,
    })
  })
}
