import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { IssueIdSchema } from '@meridian/core'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { DEV_TAGS } from './constants.js'

const LIST_ISSUE_COMMENTS_INPUT_SCHEMA = z.object({
  issueId: IssueIdSchema.describe('UUID of the issue to list comments for'),
  page: z.number().int().positive().optional().describe('Page number (default: 1)'),
  limit: z.number().int().positive().max(100).optional().describe('Results per page, max 100 (default: 20)'),
})

export function registerListIssueCommentsTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'list_issue_comments', {
    title: 'List comments for an issue',
    description: [
      'Lists all comments on a specific issue with pagination.',
      'Use this to review the discussion history, progress notes,',
      'and decisions documented on a task.',
    ].join(' '),
    inputSchema: LIST_ISSUE_COMMENTS_INPUT_SCHEMA.shape,
    tags: DEV_TAGS,
  }, async (args) => {
    const pagination = {
      page: args.page ?? 1,
      limit: args.limit ?? 20,
    }
    const result = await dependencies.getCommentsByIssue.execute(
      args.issueId,
      pagination,
    )
    return unwrapResultToMcpResponse(result)
  })
}
