import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { MilestoneIdSchema, PrioritySchema, StateSchema, UserIdSchema } from '@meridian/core'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { SHARED_TAGS } from './constants.js'

const SEARCH_ISSUES_INPUT_SCHEMA = z.object({
  search: z.string().optional().describe('Free-text search across issue title and description'),
  state: StateSchema.optional().describe('Filter by state: "open", "in_progress", or "done"'),
  status: z.string().optional().describe('Filter by workflow status (e.g. "backlog", "ready", "in_review")'),
  priority: PrioritySchema.optional().describe('Filter by priority: "low", "normal", "high", or "urgent"'),
  assigneeId: UserIdSchema.optional().describe('Filter by assigned user UUID'),
  milestoneId: MilestoneIdSchema.optional().describe('Filter by milestone UUID'),
  page: z.number().int().positive().optional().describe('Page number (default: 1)'),
  limit: z.number().int().positive().max(100).optional().describe('Results per page, max 100 (default: 20)'),
})

export function registerSearchIssuesTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'search_issues', {
    title: 'Search and filter issues',
    description: [
      'Searches and filters issues across all milestones. Supports free-text search across',
      'title and description, plus optional filters for state, status, priority, assignee, and milestone.',
      'Filters combine with AND logic. Returns paginated results.',
      'For a developer\'s personal task list grouped by state, use list_my_issues instead.',
    ].join(' '),
    inputSchema: SEARCH_ISSUES_INPUT_SCHEMA.shape,
    tags: SHARED_TAGS,
  }, async (args) => {
    const filter = {
      search: args.search,
      state: args.state,
      status: args.status,
      priority: args.priority,
      assigneeId: args.assigneeId,
      milestoneId: args.milestoneId,
    }
    const pagination = {
      page: args.page ?? 1,
      limit: args.limit ?? 20,
    }
    const result = await dependencies.listIssues.execute(filter, pagination)
    return unwrapResultToMcpResponse(result)
  })
}
