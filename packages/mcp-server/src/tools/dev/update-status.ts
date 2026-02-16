import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { IssueIdSchema, StatusSchema } from '@meridian/core'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { DEV_TAGS, SYSTEM_USER_ID } from './constants.js'

const UPDATE_STATUS_INPUT_SCHEMA = z.object({
  issueId: IssueIdSchema.describe('UUID of the issue to update'),
  status: StatusSchema.describe('New status: "open", "in_progress", or "closed"'),
})

export function registerUpdateStatusTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'update_status', {
    title: 'Update issue status',
    description: [
      'Changes the status of an issue. Valid statuses are: open, in_progress, closed.',
      'Use this when starting work on a task (open -> in_progress), completing it',
      '(in_progress -> closed), or reopening a previously closed issue.',
    ].join(' '),
    inputSchema: UPDATE_STATUS_INPUT_SCHEMA.shape,
    tags: DEV_TAGS,
  }, async (args) => {
    const result = await dependencies.updateStatus.execute(
      args.issueId,
      args.status,
      SYSTEM_USER_ID,
    )
    return unwrapResultToMcpResponse(result)
  })
}
