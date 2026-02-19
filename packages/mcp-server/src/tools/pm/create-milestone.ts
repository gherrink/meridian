import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'

import type { McpServerDependencies } from '../../types.js'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { PM_TAGS, SYSTEM_USER_ID } from './constants.js'

const CREATE_MILESTONE_INPUT_SCHEMA = z.object({
  name: z.string().min(1).max(200).describe('Name of the milestone to create'),
  description: z.string().optional().describe('Optional description of the milestone scope and purpose'),
  metadata: z.record(z.string(), z.string()).optional().describe('Optional key-value metadata for the milestone (string keys and string values, e.g. {"team": "backend", "quarter": "Q1"})'),
})

export function registerCreateMilestoneTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'create_milestone', {
    title: 'Create a new milestone',
    description: [
      'Creates a new milestone to organize and track issues.',
      'Use this when a PM needs to set up a new milestone,',
      'initiative, or sprint that will contain issues.',
    ].join(' '),
    inputSchema: CREATE_MILESTONE_INPUT_SCHEMA.shape,
    tags: PM_TAGS,
  }, async (args) => {
    const result = await dependencies.createMilestone.execute(
      {
        name: args.name,
        description: args.description,
        metadata: args.metadata,
      },
      SYSTEM_USER_ID,
    )

    return unwrapResultToMcpResponse(result)
  })
}
