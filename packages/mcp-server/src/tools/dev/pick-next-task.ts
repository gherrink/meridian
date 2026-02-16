import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { PrioritySchema, StatusSchema, UserIdSchema } from '@meridian/core'
import { z } from 'zod'

import { formatSuccessResponse, registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { DEV_TAGS } from './constants.js'

const PICK_NEXT_TASK_INPUT_SCHEMA = z.object({
  status: StatusSchema.optional().describe('Optional status filter: "open", "in_progress", or "closed"'),
  priority: PrioritySchema.optional().describe('Optional priority filter: "low", "normal", "high", or "urgent"'),
  assigneeId: UserIdSchema.optional().describe('Optional user UUID to filter by assignee'),
  limit: z.number().int().positive().max(10).default(3).describe('Number of task suggestions to return, max 10 (default: 3)'),
})

export function registerPickNextTaskTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'pick_next_task', {
    title: 'Suggest next task to work on',
    description: [
      'Suggests the highest-priority tasks available for a developer to pick up.',
      'Returns tasks sorted by priority (urgent first). Use optional filters to',
      'narrow by status, priority level, or assignee. Helpful when finishing a task',
      'and looking for the next most impactful thing to work on.',
    ].join(' '),
    inputSchema: PICK_NEXT_TASK_INPUT_SCHEMA.shape,
    tags: DEV_TAGS,
  }, async (args) => {
    const result = await dependencies.listIssues.execute(
      {
        status: args.status,
        priority: args.priority,
        assigneeId: args.assigneeId,
      },
      { page: 1, limit: args.limit },
      { field: 'priority', direction: 'desc' },
    )

    if (!result.ok) {
      return unwrapResultToMcpResponse(result)
    }

    const suggestions = result.value.items.map((issue, index) => ({
      rank: index + 1,
      id: issue.id,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      assigneeIds: issue.assigneeIds,
    }))

    return formatSuccessResponse({
      suggestions,
      total: result.value.total,
    })
  })
}
