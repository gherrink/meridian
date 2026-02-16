import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { IssueIdSchema } from '@meridian/core'
import { z } from 'zod'

import { formatSuccessResponse, registerTool } from '../../helpers/index.js'
import { DEV_TAGS } from './constants.js'

const VIEW_ISSUE_DETAIL_INPUT_SCHEMA = z.object({
  issueId: IssueIdSchema.describe('UUID of the issue to view'),
})

export function registerViewIssueDetailTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'view_issue_detail', {
    title: 'View issue details',
    description: [
      'Retrieves full details of an issue including its metadata, status, priority,',
      'assignees, and all associated comments. Use this to understand the full context',
      'of a task before starting work, reviewing progress, or making decisions.',
    ].join(' '),
    inputSchema: VIEW_ISSUE_DETAIL_INPUT_SCHEMA.shape,
    tags: DEV_TAGS,
  }, async (args) => {
    const issue = await dependencies.issueRepository.getById(args.issueId)
    const comments = await dependencies.commentRepository.getByIssueId(
      args.issueId,
      { page: 1, limit: 50 },
    )
    return formatSuccessResponse({
      issue,
      comments: comments.items,
    })
  })
}
