# Task 3.6: Support stdio Transport

> **Epic:** MCP Server & Role Profiles
> **Type:** Feature
> **Priority:** High
> **Effort:** Small (< 1 day)
> **Dependencies:** 3.1
> **Status:** Pending

## Goal
Configure the MCP server to support stdio transport for local Claude Code usage. This is the default and primary transport for development.

## Background
stdio transport is the simplest MCP transport — the MCP client (Claude Code) launches the server as a subprocess and communicates via stdin/stdout. This is ideal for local development where the developer runs Claude Code on the same machine as the Heart. No network configuration needed.

## Acceptance Criteria
- [ ] MCP server can start in stdio mode
- [ ] stdin/stdout communication works correctly (JSON-RPC over stdio)
- [ ] Server process exits cleanly when stdin closes
- [ ] Logging does NOT go to stdout (would corrupt MCP protocol) — uses stderr or file
- [ ] stdio mode is the default when `MCP_TRANSPORT=stdio` or not specified
- [ ] Can be tested with a simple script that sends MCP messages to stdin

## Subtasks
- [ ] Configure MCP SDK stdio transport
- [ ] Ensure all logging goes to stderr or file (not stdout) when in stdio mode
- [ ] Handle stdin close gracefully (clean shutdown)
- [ ] Write a test script that simulates MCP client communication over stdio
- [ ] Document how to configure Claude Code to connect via stdio

## Notes
- stdio transport is the standard for local MCP servers used with Claude Code
- The critical gotcha: any console.log or stdout output will break the MCP protocol. All application logging MUST go to stderr or a log file
- The MCP SDK handles most stdio transport complexity — this task is mainly about configuration and ensuring nothing else writes to stdout
- Claude Code configuration typically looks like: `"command": "node", "args": ["path/to/heart/main.js"]`
