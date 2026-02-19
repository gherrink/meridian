import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { IssueIdSchema, StateSchema } from '@meridian/core'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { DEV_TAGS, SYSTEM_USER_ID } from './constants.js'

const UPDATE_STATE_INPUT_SCHEMA = z.object({
  issueId: IssueIdSchema.describe('UUID of the issue to update'),
  state: StateSchema.describe('New state: "open", "in_progress", or "done"'),
})

export function registerUpdateStatusTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'update_status', {
    title: 'Update issue state',
    description: [
      'Changes the state of an issue. Valid states are: open, in_progress, done.',
      'Use this when starting work on a task (open -> in_progress), completing it',
      '(in_progress -> done), or reopening a previously completed issue.',
    ].join(' '),
    inputSchema: UPDATE_STATE_INPUT_SCHEMA.shape,
    tags: DEV_TAGS,
  }, async (args) => {
    const result = await dependencies.updateState.execute(
      args.issueId,
      args.state,
      SYSTEM_USER_ID,
    )
    return unwrapResultToMcpResponse(result)
  })
}
