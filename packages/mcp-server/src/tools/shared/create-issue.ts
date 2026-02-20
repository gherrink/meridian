import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { IssueIdSchema, MilestoneIdSchema, PrioritySchema, StateSchema, StatusSchema, TagSchema, UserIdSchema } from '@meridian/core'
import { z } from 'zod'

import { registerTool, unwrapResultToMcpResponse } from '../../helpers/index.js'
import { SYSTEM_USER_ID } from '../pm/constants.js'
import { SHARED_TAGS } from './constants.js'

const CREATE_ISSUE_INPUT_SCHEMA = z.object({
  title: z.string().min(1).max(500).describe('Short, descriptive title for the issue'),
  description: z.string().optional().describe('Detailed explanation of the issue'),
  milestoneId: MilestoneIdSchema.nullable().optional().describe('UUID of the milestone this issue belongs to (optional)'),
  state: StateSchema.optional().describe('Lifecycle state: open, in_progress, or done (defaults to open)'),
  status: StatusSchema.optional().describe('Workflow status string such as backlog, ready, in_progress, in_review, done (defaults to backlog)'),
  priority: PrioritySchema.optional().describe('Priority level: low, normal, high, or urgent (defaults to normal)'),
  parentId: IssueIdSchema.nullable().optional().describe('UUID of a parent issue for hierarchical nesting (optional)'),
  assigneeIds: z.array(UserIdSchema).optional().describe('List of user UUIDs to assign to this issue'),
  tags: z.array(TagSchema).optional().describe('Tag objects with id, name, and optional hex color'),
  dueDate: z.string().datetime().nullable().optional().describe('ISO 8601 due date for the issue (optional)'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Arbitrary key-value metadata for the issue'),
})

function parseDueDate(dueDate: string | null | undefined): Date | null | undefined {
  if (dueDate === undefined) {
    return undefined
  }
  return dueDate !== null ? new Date(dueDate) : null
}

export function registerCreateIssueTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'create_issue', {
    title: 'Create a new issue',
    description: [
      'Creates a new issue in the project tracker.',
      'Use this to create tasks, bugs, stories, or any work item.',
      'Only the title is required; all other fields have sensible defaults.',
      'Optionally specify a parentId to nest this issue under another issue,',
      'or a milestoneId to associate it with a milestone.',
    ].join(' '),
    inputSchema: CREATE_ISSUE_INPUT_SCHEMA.shape,
    tags: SHARED_TAGS,
  }, async (args) => {
    const result = await dependencies.createIssue.execute(
      {
        milestoneId: args.milestoneId ?? null,
        title: args.title,
        description: args.description,
        state: args.state,
        status: args.status,
        priority: args.priority,
        parentId: args.parentId ?? null,
        assigneeIds: args.assigneeIds,
        tags: args.tags,
        dueDate: parseDueDate(args.dueDate),
        metadata: args.metadata,
      },
      SYSTEM_USER_ID,
    )

    return unwrapResultToMcpResponse(result)
  })
}
