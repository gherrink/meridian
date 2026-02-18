import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { z } from 'zod'

import { formatSuccessResponse, registerTool } from '../../helpers/index.js'
import { SHARED_TAGS } from './constants.js'

const LIST_MILESTONES_INPUT_SCHEMA = z.object({
  page: z.number().int().positive().optional().describe('Page number (default: 1)'),
  limit: z.number().int().positive().max(100).optional().describe('Results per page, max 100 (default: 20)'),
})

export function registerListMilestonesTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'list_milestones', {
    title: 'List all milestones',
    description: [
      'Lists all available milestones with pagination. Returns milestone names,',
      'descriptions, and metadata. Use this to discover milestone IDs for',
      'filtering issues or navigating the milestone hierarchy.',
    ].join(' '),
    inputSchema: LIST_MILESTONES_INPUT_SCHEMA.shape,
    tags: SHARED_TAGS,
  }, async (args) => {
    const pagination = {
      page: args.page ?? 1,
      limit: args.limit ?? 20,
    }
    const result = await dependencies.milestoneRepository.list(pagination)
    return formatSuccessResponse(result)
  })
}
