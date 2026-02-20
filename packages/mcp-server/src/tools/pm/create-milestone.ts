import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'

import type { McpServerDependencies } from '../../types.js'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { PM_TAGS, SYSTEM_USER_ID } from './constants.js'

const CREATE_MILESTONE_INPUT_SCHEMA = z.object({
  name: z.string().min(1).max(200).describe('Name of the milestone to create'),
  description: z.string().optional().describe('Optional description of the milestone scope and purpose'),
  status: z.enum(['open', 'closed']).optional().describe('Milestone status: "open" (default) or "closed"'),
  dueDate: z.string().datetime().nullable().optional().describe('Due date as ISO 8601 string, or null for no due date'),
  metadata: z.record(z.string(), z.string()).optional().describe('Optional key-value metadata for the milestone (string keys and string values, e.g. {"team": "backend", "quarter": "Q1"})'),
})

function parseDueDate(dueDate: string | null | undefined): Date | null | undefined {
  if (dueDate === null || dueDate === undefined) {
    return dueDate
  }
  const parsed = new Date(dueDate)
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError(`Invalid due date: "${dueDate}" could not be parsed as a valid date`)
  }
  return parsed
}

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
        status: args.status,
        dueDate: parseDueDate(args.dueDate),
        metadata: args.metadata,
      },
      SYSTEM_USER_ID,
    )

    return unwrapResultToMcpResponse(result)
  })
}
