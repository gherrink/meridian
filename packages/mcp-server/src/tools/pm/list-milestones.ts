import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { z } from 'zod'

import { formatSuccessResponse, registerTool } from '../../helpers/index.js'
import { PM_TAGS } from './constants.js'

const LIST_MILESTONES_INPUT_SCHEMA = z.object({
  page: z.number().int().positive().optional().default(1).describe('Page number for pagination (starts at 1)'),
  limit: z.number().int().positive().max(50).optional().default(20).describe('Number of milestones per page (max 50)'),
})

export function registerListMilestonesTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'list_milestones', {
    title: 'List projects and milestones',
    description: [
      'Lists all projects and milestones with pagination.',
      'Use this when a PM wants to see what initiatives and projects exist,',
      'browse the project catalogue, or find a specific project by scanning the list.',
      'Returns project names, descriptions, and metadata.',
    ].join(' '),
    inputSchema: LIST_MILESTONES_INPUT_SCHEMA.shape,
    tags: PM_TAGS,
  }, async (args) => {
    const paginatedProjects = await dependencies.projectRepository.list({
      page: args.page,
      limit: args.limit,
    })
    return formatSuccessResponse(paginatedProjects)
  })
}
