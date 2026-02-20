import type { IssueId } from '@meridian/core'
import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'

import type { McpServerDependencies } from '../../types.js'

import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { PM_TAGS } from './constants.js'

const LIST_ISSUE_LINKS_INPUT_SCHEMA = z.object({
  issueId: z.string().uuid().describe('UUID of the issue to list links for'),
  type: z.string().optional().describe('Optional relationship type to filter by'),
})

export function registerListIssueLinksTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'list_issue_links', {
    title: 'List links for an issue',
    description: [
      'Lists all relationships for a given issue.',
      'Returns resolved links with labels indicating direction.',
      'Optionally filter by relationship type.',
    ].join(' '),
    inputSchema: LIST_ISSUE_LINKS_INPUT_SCHEMA.shape,
    tags: PM_TAGS,
  }, async (args) => {
    const filter = args.type !== undefined ? { type: args.type } : undefined
    const result = await dependencies.listIssueLinks.execute(
      args.issueId as IssueId,
      filter,
    )
    return unwrapResultToMcpResponse(result)
  })
}
