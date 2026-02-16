import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { IssueIdSchema, PrioritySchema } from '@meridian/core'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { PM_TAGS, SYSTEM_USER_ID } from './constants.js'

const ASSIGN_PRIORITY_INPUT_SCHEMA = z.object({
  issueId: IssueIdSchema.describe('UUID of the issue to update'),
  priority: PrioritySchema.describe('New priority level: "low", "normal", "high", or "urgent"'),
})

export function registerAssignPriorityTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'assign_priority', {
    title: 'Set issue priority',
    description: [
      'Sets or changes the priority of an issue. Priority values are: low, normal, high, urgent.',
      'Use this during backlog grooming, triage sessions, or when reprioritizing work.',
      'For example, escalate a blocking bug to "urgent" or demote a nice-to-have to "low".',
    ].join(' '),
    inputSchema: ASSIGN_PRIORITY_INPUT_SCHEMA.shape,
    tags: PM_TAGS,
  }, async (args) => {
    const result = await dependencies.updateIssue.execute(
      args.issueId,
      { priority: args.priority },
      SYSTEM_USER_ID,
    )
    return unwrapResultToMcpResponse(result)
  })
}
