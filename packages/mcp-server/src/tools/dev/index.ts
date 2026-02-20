import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolTagRegistry } from '../../helpers/tool-tag-registry.js'
import type { McpServerDependencies } from '../../types.js'

import { registerAddCommentTool } from './add-comment.js'
import { registerDeleteCommentTool } from './delete-comment.js'
import { registerListIssueCommentsTool } from './list-issue-comments.js'
import { registerListMyIssuesTool } from './list-my-issues.js'
import { registerPickNextTaskTool } from './pick-next-task.js'
import { registerUpdateCommentTool } from './update-comment.js'
import { registerUpdateStatusTool } from './update-status.js'
import { registerViewIssueDetailTool } from './view-issue-detail.js'

export function registerDevTools(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): Map<string, RegisteredTool> {
  const tools = new Map<string, RegisteredTool>()

  tools.set('pick_next_task', registerPickNextTaskTool(server, registry, dependencies))
  tools.set('update_status', registerUpdateStatusTool(server, registry, dependencies))
  tools.set('view_issue_detail', registerViewIssueDetailTool(server, registry, dependencies))
  tools.set('list_my_issues', registerListMyIssuesTool(server, registry, dependencies))
  tools.set('add_comment', registerAddCommentTool(server, registry, dependencies))
  tools.set('update_comment', registerUpdateCommentTool(server, registry, dependencies))
  tools.set('delete_comment', registerDeleteCommentTool(server, registry, dependencies))
  tools.set('list_issue_comments', registerListIssueCommentsTool(server, registry, dependencies))

  return tools
}
