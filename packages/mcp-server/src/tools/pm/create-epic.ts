import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'

import type { McpServerDependencies } from '../../types.js'
import { IssueIdSchema, MilestoneIdSchema } from '@meridian/core'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { PM_TAGS, SYSTEM_USER_ID } from './constants.js'

const CREATE_EPIC_INPUT_SCHEMA = z.object({
  milestoneId: MilestoneIdSchema.nullable().optional().describe('UUID of the milestone this epic belongs to (optional)'),
  title: z.string().min(1).max(500).describe('Short, descriptive name for the epic'),
  description: z.string().optional().describe('Detailed explanation of the epic scope and goals'),
  parentId: IssueIdSchema.optional().describe('UUID of a parent issue for nesting this epic under another issue'),
})

export function registerCreateEpicTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'create_epic', {
    title: 'Create a new epic',
    description: [
      'Creates a high-level epic to group related issues into a single initiative.',
      'Use this when a PM needs to plan a new feature, milestone, or body of work',
      'that spans multiple issues. The epic is created as an issue with type "epic" in its metadata.',
      'Optionally specify a parentId to nest this epic under another issue.',
    ].join(' '),
    inputSchema: CREATE_EPIC_INPUT_SCHEMA.shape,
    tags: PM_TAGS,
  }, async (args) => {
    const result = await dependencies.createIssue.execute(
      {
        milestoneId: args.milestoneId ?? null,
        title: args.title,
        description: args.description,
        parentId: args.parentId ?? null,
        metadata: { type: 'epic' },
      },
      SYSTEM_USER_ID,
    )

    return unwrapResultToMcpResponse(result)
  })
}
