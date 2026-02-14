# Task 3.3: Define PM Role Tools

> **Epic:** MCP Server & Role Profiles
> **Type:** Feature
> **Priority:** High
> **Effort:** Large (3-5 days)
> **Dependencies:** 3.1, 3.2, 1.6
> **Status:** Pending

## Goal
Define and implement the PM (Project Manager) role tools for the MCP server. These tools help PMs plan, prioritize, and oversee project progress through LLM-assisted workflows.

## Background
PM tools are designed for project planning and oversight. They expose high-level operations: creating epics, viewing roadmaps, assigning priorities, listing milestones, and getting project overviews. Each tool has a Zod input schema, a clear description (optimized for LLM understanding), and a handler that delegates to domain use cases. Tools are tagged with `pm` for role-based filtering.

## Acceptance Criteria
- [ ] `create-epic` tool: creates an epic with title, description, and optional child issues
- [ ] `view-roadmap` tool: returns project overview with milestone progress and issue distribution
- [ ] `assign-priority` tool: sets priority on an issue or epic
- [ ] `list-milestones` tool: lists all milestones/projects with progress info
- [ ] `project-overview` tool: returns comprehensive project status (issue counts, burndown, blockers)
- [ ] All tools tagged with `pm` role
- [ ] All tools have clear, LLM-optimized descriptions (explains what the tool does, when to use it, and example scenarios)
- [ ] All tools have Zod input schemas with descriptive field names
- [ ] All tool handlers delegate to domain use cases (no business logic in handlers)
- [ ] All tools return structured, readable text responses (not raw JSON dumps)

## Subtasks
- [ ] Design `create-epic` tool: schema, description, handler → CreateIssue use case (with epic type)
- [ ] Design `view-roadmap` tool: schema, description, handler → GetProjectOverview use case
- [ ] Design `assign-priority` tool: schema, description, handler → UpdateIssue use case (priority field)
- [ ] Design `list-milestones` tool: schema, description, handler → list projects use case
- [ ] Design `project-overview` tool: schema, description, handler → GetProjectOverview use case (detailed)
- [ ] Write clear tool descriptions optimized for LLM comprehension
- [ ] Tag all tools with `pm` role
- [ ] Format tool responses as readable text (not raw JSON) with clear structure
- [ ] Write tests for each tool handler (input validation, use case delegation, response formatting)
- [ ] Test with sample LLM prompts to verify descriptions are unambiguous

## Notes
- Tool descriptions are the most important part — LLMs choose tools based on descriptions. Invest time in making them clear and specific
- Include example usage scenarios in descriptions (e.g., "Use this tool when the user asks to create a new feature epic or work stream")
- Response formatting should be LLM-friendly: structured text with clear labels, not raw JSON blobs
- Some PM tools may overlap with shared tools (e.g., `project-overview` vs `get-issue`) — that's fine, PM tools should provide more strategic/aggregated views
- Consider how these tools compose in multi-turn LLM conversations (e.g., "Create an epic, then break it into tasks")
