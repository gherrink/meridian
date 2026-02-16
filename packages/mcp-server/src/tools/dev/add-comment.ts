import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { IssueIdSchema } from '@meridian/core'
import { z } from 'zod'

import { formatSuccessResponse, registerTool } from '../../helpers/index.js'
import { DEV_TAGS, SYSTEM_USER_ID } from './constants.js'

const ADD_COMMENT_INPUT_SCHEMA = z.object({
  issueId: IssueIdSchema.describe('UUID of the issue to comment on'),
  body: z.string().min(1).describe('Comment text body'),
})

export function registerAddCommentTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'add_comment', {
    title: 'Add comment to issue',
    description: [
      'Creates a new comment on an issue. Use this to leave progress notes,',
      'ask questions, or document decisions related to a task.',
      'The comment will be attributed to the current system user.',
    ].join(' '),
    inputSchema: ADD_COMMENT_INPUT_SCHEMA.shape,
    tags: DEV_TAGS,
  }, async (args) => {
    const comment = await dependencies.commentRepository.create({
      issueId: args.issueId,
      body: args.body,
      authorId: SYSTEM_USER_ID,
    })
    return formatSuccessResponse({
      id: comment.id,
      issueId: comment.issueId,
      createdAt: comment.createdAt,
    })
  })
}
