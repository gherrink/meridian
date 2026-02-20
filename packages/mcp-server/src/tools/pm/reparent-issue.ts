import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { IssueIdSchema } from '@meridian/core'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { PM_TAGS, SYSTEM_USER_ID } from './constants.js'

const REPARENT_ISSUE_INPUT_SCHEMA = z.object({
  issueId: IssueIdSchema.describe('UUID of the issue to reparent'),
  parentId: IssueIdSchema.nullable().describe('UUID of the new parent issue, or null to make it a root issue'),
})

export function registerReparentIssueTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'reparent_issue', {
    title: 'Move issue in hierarchy',
    description: [
      'Changes the parent of an issue to reorganize the issue hierarchy.',
      'Set parentId to a valid issue UUID to nest under that parent, or set to null',
      'to make it a root-level issue. Maximum nesting depth is 3 levels.',
      'Circular references are automatically detected and rejected.',
    ].join(' '),
    inputSchema: REPARENT_ISSUE_INPUT_SCHEMA.shape,
    tags: PM_TAGS,
  }, async (args) => {
    const result = await dependencies.reparentIssue.execute(
      args.issueId,
      args.parentId,
      SYSTEM_USER_ID,
    )
    return unwrapResultToMcpResponse(result)
  })
}
