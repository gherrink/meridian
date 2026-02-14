# Task 3.2: Implement Tag-Based Role Filtering

> **Epic:** MCP Server & Role Profiles
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 3.1
> **Status:** Pending

## Goal
Implement the tag-based tool filtering system that controls which MCP tools are visible to different role profiles (PM, Dev, shared). This follows the Xweather pattern for MCP tool scoping.

## Background
When an LLM connects to the MCP server, it should only see tools relevant to its role — a PM assistant sees planning tools, a Dev assistant sees development tools. This is implemented via tags on each tool and filter parameters on the connection. The filtering uses the Xweather pattern: each tool has tags, and clients specify `include_tags` and/or `exclude_tags`. Exclude takes precedence over include.

## Acceptance Criteria
- [ ] Each tool can be tagged with one or more roles (e.g., `pm`, `dev`, `shared`)
- [ ] Connection-level filtering via `include_tags` and `exclude_tags` parameters
- [ ] Precedence rules: exclude > include (a tool tagged `pm` + `shared` excluded by `exclude_tags=pm` is hidden)
- [ ] No filter specified → all tools visible
- [ ] `include_tags=pm` → only tools tagged `pm` or `shared` visible
- [ ] `exclude_tags=dev` → all tools except those tagged only `dev` visible
- [ ] Filter state is per-connection (different clients can have different filters)
- [ ] Comprehensive tests for all filter combinations and edge cases

## Subtasks
- [ ] Define tag schema for tools (tool name → set of tags)
- [ ] Implement filter resolution logic with precedence rules
- [ ] Implement tool listing that applies filters before returning available tools
- [ ] Handle filter parameters from connection/configuration
- [ ] Test: no filters → all tools
- [ ] Test: include_tags only → matching tools + shared tools
- [ ] Test: exclude_tags only → all except excluded
- [ ] Test: both include and exclude → exclude takes precedence
- [ ] Test: tool with multiple tags → resolved correctly
- [ ] Test: empty result (all tools excluded)

## Notes
- The Xweather MCP server is the reference implementation for this pattern
- Filters can come from: server configuration (default role), connection parameters, or query params (for HTTP transport)
- Consider a `shared` tag for tools that should always be visible regardless of role filters
- The filter logic should be a pure function — easy to test without the MCP server infrastructure
- This is a security-adjacent feature: while not auth, it controls what capabilities are exposed. Test thoroughly.
