# Task 3.5: Define Shared Tools

> **Epic:** MCP Server & Role Profiles
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 3.1, 1.6
> **Status:** Pending

## Goal
Define and implement shared MCP tools that are available to all role profiles. These are general-purpose tools for querying issues and projects that both PMs and Devs need.

## Background
Shared tools provide common read operations that every role needs — searching issues, getting issue details, and listing projects. They are tagged with `shared` so they appear regardless of which role filter is active. These tools complement the role-specific tools by providing foundational query capabilities.

## Acceptance Criteria
- [ ] `search-issues` tool: full-text search across issues with optional filters
- [ ] `get-issue` tool: retrieve a single issue by ID with full details
- [ ] `list-projects` tool: list all available projects/repositories
- [ ] All tools tagged with `shared` role
- [ ] All tools have clear descriptions and Zod input schemas
- [ ] All tool handlers delegate to domain use cases
- [ ] Tools return structured, readable text responses
- [ ] Tools visible when any role filter is active (or no filter)

## Subtasks
- [ ] Design `search-issues` tool: schema (query, optional status/priority/assignee filters), description, handler → ListIssues/search use case
- [ ] Design `get-issue` tool: schema (issue_id), description, handler → get issue use case
- [ ] Design `list-projects` tool: schema (optional filters), description, handler → list projects use case
- [ ] Write clear tool descriptions applicable to any role
- [ ] Tag all tools with `shared`
- [ ] Format responses with appropriate detail level
- [ ] Write tests for each tool handler
- [ ] Verify shared tools appear alongside both PM and Dev role tools

## Notes
- `search-issues` should support natural query terms and optional structured filters — LLMs may pass free-text queries or structured parameters
- `get-issue` may overlap with `view-issue-detail` (Dev tool) — the shared version should return standard details, while the Dev version may include more context
- Consider whether `list-projects` needs pagination for organizations with many repos
- Shared tools are the minimum set needed for basic project querying regardless of role
