import type { IssueLinkId } from '@meridian/core'
import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'

import type { McpServerDependencies } from '../../types.js'

import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { PM_TAGS } from './constants.js'

const UNLINK_ISSUES_INPUT_SCHEMA = z.object({
  linkId: z.string().uuid().describe('UUID of the issue link to remove'),
})

export function registerUnlinkIssuesTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'unlink_issues', {
    title: 'Remove a link between issues',
    description: [
      'Deletes an existing relationship between two issues by link ID.',
      'Use list_issue_links to find the link ID first.',
      'This action cannot be undone.',
    ].join(' '),
    inputSchema: UNLINK_ISSUES_INPUT_SCHEMA.shape,
    tags: PM_TAGS,
  }, async (args) => {
    const result = await dependencies.deleteIssueLink.execute(args.linkId as IssueLinkId)
    return unwrapResultToMcpResponse(result)
  })
}
