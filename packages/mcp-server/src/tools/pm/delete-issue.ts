import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { IssueIdSchema } from '@meridian/core'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { PM_TAGS, SYSTEM_USER_ID } from './constants.js'

const DELETE_ISSUE_INPUT_SCHEMA = z.object({
  issueId: IssueIdSchema.describe('UUID of the issue to delete'),
})

export function registerDeleteIssueTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'delete_issue', {
    title: 'Delete an issue',
    description: [
      'Permanently deletes an issue and its associated data.',
      'Use this to remove duplicate, test, or invalid issues.',
      'This action cannot be undone.',
    ].join(' '),
    inputSchema: DELETE_ISSUE_INPUT_SCHEMA.shape,
    tags: PM_TAGS,
  }, async (args) => {
    const result = await dependencies.deleteIssue.execute(
      args.issueId,
      SYSTEM_USER_ID,
    )
    return unwrapResultToMcpResponse(result)
  })
}
