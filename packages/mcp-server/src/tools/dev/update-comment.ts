import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { CommentIdSchema } from '@meridian/core'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { DEV_TAGS, SYSTEM_USER_ID } from './constants.js'

const UPDATE_COMMENT_INPUT_SCHEMA = z.object({
  commentId: CommentIdSchema.describe('UUID of the comment to update'),
  body: z.string().min(1).describe('Updated comment text body'),
})

export function registerUpdateCommentTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'update_comment', {
    title: 'Update a comment',
    description: [
      'Updates the body of an existing comment on an issue.',
      'Use this to correct, expand, or revise a previously posted comment.',
    ].join(' '),
    inputSchema: UPDATE_COMMENT_INPUT_SCHEMA.shape,
    tags: DEV_TAGS,
  }, async (args) => {
    const result = await dependencies.updateComment.execute(
      args.commentId,
      { body: args.body },
      SYSTEM_USER_ID,
    )
    return unwrapResultToMcpResponse(result)
  })
}
