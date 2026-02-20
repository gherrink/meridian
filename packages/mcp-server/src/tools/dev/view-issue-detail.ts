import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { IssueIdSchema } from '@meridian/core'
import { z } from 'zod'

import { formatSuccessResponse, registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { DEV_TAGS } from './constants.js'

const DEFAULT_COMMENT_PAGE = 1
const DEFAULT_COMMENT_LIMIT = 50

const VIEW_ISSUE_DETAIL_INPUT_SCHEMA = z.object({
  issueId: IssueIdSchema.describe('UUID of the issue to view'),
  commentPage: z.number().int().positive().optional().describe('Comment page number (default: 1)'),
  commentLimit: z.number().int().positive().max(100).optional().describe('Comments per page, max 100 (default: 50). Use list_issue_comments for full pagination control.'),
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
      'assignees, and all comments. Use this to understand the full context',
      'of a task before starting work, reviewing progress, or making decisions.',
      'Returns up to 50 comments by default; use commentPage/commentLimit params',
      'or the list_issue_comments tool for issues with more comments.',
      'For just the issue entity without comments, use get_issue instead.',
    ].join(' '),
    inputSchema: VIEW_ISSUE_DETAIL_INPUT_SCHEMA.shape,
    tags: DEV_TAGS,
  }, async (args) => {
    const issue = await dependencies.issueRepository.getById(args.issueId)
    const commentsResult = await dependencies.getCommentsByIssue.execute(
      args.issueId,
      {
        page: args.commentPage ?? DEFAULT_COMMENT_PAGE,
        limit: args.commentLimit ?? DEFAULT_COMMENT_LIMIT,
      },
    )

    if (!commentsResult.ok) {
      return unwrapResultToMcpResponse(commentsResult)
    }

    return formatSuccessResponse({
      issue,
      comments: commentsResult.value.items,
    })
  })
}
