import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { IssueIdSchema } from '@meridian/core'
import { z } from 'zod'

import { formatSuccessResponse, registerTool } from '../../helpers/index.js'
import { SHARED_TAGS } from './constants.js'

const GET_ISSUE_INPUT_SCHEMA = z.object({
  issueId: IssueIdSchema.describe('UUID of the issue to retrieve'),
})

export function registerGetIssueTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'get_issue', {
    title: 'Get issue by ID',
    description: [
      'Retrieves a single issue by its UUID. Returns the full issue entity including',
      'status, priority, assignees, tags, and timestamps. Throws an error if the',
      'issue does not exist.',
      'Returns the issue entity only, without comments.',
      'For full context including comments, use view_issue_detail instead.',
    ].join(' '),
    inputSchema: GET_ISSUE_INPUT_SCHEMA.shape,
    tags: SHARED_TAGS,
  }, async (args) => {
    const issue = await dependencies.issueRepository.getById(args.issueId)
    return formatSuccessResponse(issue)
  })
}
