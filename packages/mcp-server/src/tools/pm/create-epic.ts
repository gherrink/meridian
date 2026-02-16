import type { IssueId } from '@meridian/core'
import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'

import type { McpServerDependencies } from '../../types.js'
import { IssueIdSchema, ProjectIdSchema } from '@meridian/core'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { PM_TAGS, SYSTEM_USER_ID } from './constants.js'

const CREATE_EPIC_INPUT_SCHEMA = z.object({
  projectId: ProjectIdSchema.describe('UUID of the project this epic belongs to'),
  title: z.string().min(1).max(500).describe('Short, descriptive name for the epic'),
  description: z.string().optional().describe('Detailed explanation of the epic scope and goals'),
  childIssueIds: z.array(IssueIdSchema).optional().describe('UUIDs of existing issues to group under this epic'),
})

function buildEpicMetadata(childIssueIds?: IssueId[]): Record<string, unknown> {
  const base = { type: 'epic' }
  if (childIssueIds && childIssueIds.length > 0) {
    return { ...base, childIssueIds }
  }
  return base
}

export function registerCreateEpicTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'create_epic', {
    title: 'Create a new epic',
    description: [
      'Creates a high-level epic to group related issues into a single initiative.',
      'Use this when a PM needs to plan a new feature, project milestone, or body of work',
      'that spans multiple issues. The epic is created as an issue with type "epic" in its metadata.',
      'Optionally link existing issues as children at creation time.',
    ].join(' '),
    inputSchema: CREATE_EPIC_INPUT_SCHEMA.shape,
    tags: PM_TAGS,
  }, async (args) => {
    const result = await dependencies.createIssue.execute(
      {
        projectId: args.projectId,
        title: args.title,
        description: args.description,
        metadata: buildEpicMetadata(args.childIssueIds),
      },
      SYSTEM_USER_ID,
    )

    return unwrapResultToMcpResponse(result)
  })
}
