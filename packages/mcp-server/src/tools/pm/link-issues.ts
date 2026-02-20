import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { PM_TAGS } from './constants.js'

const LINK_ISSUES_INPUT_SCHEMA = z.object({
  sourceIssueId: z.string().uuid().describe('UUID of the source issue'),
  targetIssueId: z.string().uuid().describe('UUID of the target issue'),
  type: z.string().min(1).describe('Relationship type name (e.g. blocks, duplicates, relates-to)'),
})

export function registerLinkIssuesTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'link_issues', {
    title: 'Link two issues',
    description: [
      'Creates a relationship between two issues.',
      'Supported types include blocks, duplicates, and relates-to.',
      'Self-links and duplicate links are automatically rejected.',
      'Symmetric relationship types normalize source/target order.',
    ].join(' '),
    inputSchema: LINK_ISSUES_INPUT_SCHEMA.shape,
    tags: PM_TAGS,
  }, async (args) => {
    const result = await dependencies.createIssueLink.execute({
      sourceIssueId: args.sourceIssueId,
      targetIssueId: args.targetIssueId,
      type: args.type,
    })
    return unwrapResultToMcpResponse(result)
  })
}
