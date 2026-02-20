import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { CommentIdSchema } from '@meridian/core'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { DEV_TAGS, SYSTEM_USER_ID } from './constants.js'

const DELETE_COMMENT_INPUT_SCHEMA = z.object({
  commentId: CommentIdSchema.describe('UUID of the comment to delete'),
})

export function registerDeleteCommentTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'delete_comment', {
    title: 'Delete a comment',
    description: [
      'Permanently deletes a comment from an issue.',
      'Use this to remove erroneous, outdated, or duplicate comments.',
    ].join(' '),
    inputSchema: DELETE_COMMENT_INPUT_SCHEMA.shape,
    tags: DEV_TAGS,
  }, async (args) => {
    const result = await dependencies.deleteComment.execute(
      args.commentId,
      SYSTEM_USER_ID,
    )
    return unwrapResultToMcpResponse(result)
  })
}
