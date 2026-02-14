# Task 3.4: Define Dev Role Tools

> **Epic:** MCP Server & Role Profiles
> **Type:** Feature
> **Priority:** High
> **Effort:** Large (3-5 days)
> **Dependencies:** 3.1, 3.2, 1.6
> **Status:** Pending

## Goal
Define and implement the Dev (Developer) role tools for the MCP server. These tools help developers manage their work — picking tasks, updating status, viewing issue details, and tracking their assignments through LLM-assisted workflows.

## Background
Dev tools are designed for individual developer workflow. They expose task-level operations: picking the next task to work on, updating task status, viewing detailed issue context, listing assigned issues, and adding comments. Each tool has a Zod input schema, a clear description optimized for LLM understanding, and a handler that delegates to domain use cases. Tools are tagged with `dev` for role-based filtering.

## Acceptance Criteria
- [ ] `pick-next-task` tool: suggests the highest-priority unassigned or assigned-to-me issue
- [ ] `update-status` tool: changes issue status (e.g., open → in_progress → closed)
- [ ] `view-issue-detail` tool: returns comprehensive issue details (description, comments, history, related)
- [ ] `list-my-issues` tool: lists issues assigned to the current user, grouped by status
- [ ] `add-comment` tool: adds a comment to an issue
- [ ] All tools tagged with `dev` role
- [ ] All tools have clear, LLM-optimized descriptions with usage scenarios
- [ ] All tools have Zod input schemas with descriptive field names
- [ ] All tool handlers delegate to domain use cases
- [ ] All tools return structured, readable text responses

## Subtasks
- [ ] Design `pick-next-task` tool: schema, description, handler → ListIssues use case (filtered by priority, unassigned/assigned-to-me)
- [ ] Design `update-status` tool: schema (issue_id, new_status), description, handler → UpdateStatus use case
- [ ] Design `view-issue-detail` tool: schema (issue_id), description, handler → get issue + comments use cases
- [ ] Design `list-my-issues` tool: schema (optional status filter), description, handler → ListIssues use case (filtered by assignee)
- [ ] Design `add-comment` tool: schema (issue_id, body), description, handler → create comment use case
- [ ] Write clear tool descriptions for developer workflow context
- [ ] Tag all tools with `dev` role
- [ ] Format responses for developer context (include code-relevant details, status, priority)
- [ ] Write tests for each tool handler
- [ ] Test with sample developer LLM prompts ("What should I work on next?", "Mark this task as done")

## Notes
- `pick-next-task` is the most complex tool — it needs smart logic for suggesting what to work on (highest priority, unblocked, assigned to user or unassigned)
- `view-issue-detail` should return enough context for a developer to start working — description, acceptance criteria, related issues, recent comments
- `list-my-issues` grouped by status (in_progress first, then open, then others) is more useful than a flat list
- Dev tools should feel natural in a coding workflow — "I just finished this, mark it done and what's next?"
- Consider how `update-status` and `add-comment` might be used together (e.g., "Done with this task, here's what I did")
