# Task 3.11: Document MCP Server Configuration

> **Epic:** MCP Server & Role Profiles
> **Type:** Docs
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 3.8
> **Status:** Pending

## Goal
Write documentation for the MCP server covering connection configuration, role profile setup, available tools, and transport options.

## Background
Developers need clear instructions on how to connect their LLM clients (primarily Claude Code) to the Meridian MCP server. This includes how to configure the server, how to set up role profiles, and what each tool does.

## Acceptance Criteria
- [ ] Connection configuration documented for Claude Code (stdio and HTTP)
- [ ] All environment variables for MCP server documented
- [ ] Role profile configuration documented with examples
- [ ] All tools listed with descriptions, input schemas, and example usage
- [ ] Transport options documented (stdio vs HTTP, when to use each)
- [ ] Troubleshooting section for common connection issues

## Subtasks
- [ ] Write Claude Code configuration examples (`.claude/mcp.json` or equivalent)
- [ ] Document all MCP-related environment variables
- [ ] Write role profile guide (PM setup, Dev setup, custom combinations)
- [ ] Create tool reference: each tool with description, parameters, and example input/output
- [ ] Write transport guide: stdio (local) vs HTTP (remote), pros/cons
- [ ] Write troubleshooting guide: common errors and fixes
- [ ] Add configuration examples for different setups (solo dev, team, CI)

## Notes
- This documentation should be developer-focused and practical — someone should be able to connect Claude Code to Meridian in under 5 minutes using this guide
- Include copy-pasteable configuration snippets
- The tool reference should show example LLM prompts alongside the tool calls they trigger
- Consider keeping this as a markdown file in the repo (e.g., `docs/mcp-server.md`) rather than external docs for now
