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

export function registerListPmMilestonesTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'list_pm_milestones', {
    title: 'List milestones for planning',
    description: [
      'Lists all milestones for planning purposes.',
      'Use this as a PM to browse the milestone catalogue, find milestone IDs,',
      'or prepare for milestone reviews. Returns milestone names, descriptions, and metadata.',
      'For a quick milestone listing, prefer list_milestones instead.',
    ].join(' '),
    inputSchema: LIST_MILESTONES_INPUT_SCHEMA.shape,
    tags: PM_TAGS,
  }, async (args) => {
    const paginatedMilestones = await dependencies.milestoneRepository.list({
      page: args.page,
      limit: args.limit,
    })
    return formatSuccessResponse(paginatedMilestones)
  })
}
