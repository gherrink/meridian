import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { PrioritySchema, ProjectIdSchema, StatusSchema, UserIdSchema } from '@meridian/core'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { SHARED_TAGS } from './constants.js'

const SEARCH_ISSUES_INPUT_SCHEMA = z.object({
  search: z.string().optional().describe('Free-text search across issue title and description'),
  status: StatusSchema.optional().describe('Filter by status: "open", "in_progress", or "closed"'),
  priority: PrioritySchema.optional().describe('Filter by priority: "low", "normal", "high", or "urgent"'),
  assigneeId: UserIdSchema.optional().describe('Filter by assigned user UUID'),
  projectId: ProjectIdSchema.optional().describe('Filter by project UUID'),
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
      'Searches and filters issues across all projects. Supports free-text search across',
      'title and description, plus optional filters for status, priority, assignee, and project.',
      'Filters combine with AND logic. Returns paginated results.',
      'For a developer\'s personal task list grouped by status, use list_my_issues instead.',
    ].join(' '),
    inputSchema: SEARCH_ISSUES_INPUT_SCHEMA.shape,
    tags: SHARED_TAGS,
  }, async (args) => {
    const filter = {
      search: args.search,
      status: args.status,
      priority: args.priority,
      assigneeId: args.assigneeId,
      projectId: args.projectId,
    }
    const pagination = {
      page: args.page ?? 1,
      limit: args.limit ?? 20,
    }
    const result = await dependencies.listIssues.execute(filter, pagination)
    return unwrapResultToMcpResponse(result)
  })
}
