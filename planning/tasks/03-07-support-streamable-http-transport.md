# Task 3.7: Support Streamable HTTP Transport

> **Epic:** MCP Server & Role Profiles
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Medium (1-3 days)
> **Dependencies:** 3.1
> **Status:** Pending

## Goal
Configure the MCP server to support streamable HTTP transport for remote and shared usage scenarios where stdio is not feasible.

## Background
HTTP transport allows the MCP server to be accessed over the network — multiple LLM clients can connect to a single Heart instance. This is useful for team deployments where the Heart runs on a shared server and multiple developers' Claude Code instances connect to it. The MCP SDK supports streamable HTTP transport using Server-Sent Events (SSE) for server-to-client streaming.

## Acceptance Criteria
- [ ] MCP server can start in HTTP mode on a configurable port
- [ ] HTTP transport supports the MCP streamable HTTP protocol
- [ ] Multiple concurrent clients can connect
- [ ] Role filtering works via connection parameters or query params
- [ ] `MCP_TRANSPORT=http` enables HTTP transport
- [ ] `MCP_HTTP_PORT` configures the listening port (default: 3001)
- [ ] Health endpoint available for monitoring
- [ ] Clean shutdown when server stops

## Subtasks
- [ ] Configure MCP SDK HTTP transport
- [ ] Add HTTP port configuration from config manager
- [ ] Implement connection parameter parsing for role filter tags
- [ ] Test multiple concurrent client connections
- [ ] Test role filtering via HTTP transport connection params
- [ ] Add health check endpoint for the MCP HTTP server
- [ ] Write tests for HTTP transport communication

## Notes
- HTTP transport runs on a separate port from the REST API (REST on 3000, MCP HTTP on 3001 by default)
- Consider whether both transports (stdio + HTTP) can run simultaneously or if only one is active at a time
- Authentication for HTTP transport is not in scope for v1 — the MCP server trusts all connections. Enterprise auth (API keys, OAuth) is a v2+ concern
- The streamable HTTP transport is newer than SSE — check MCP SDK v1 documentation for the supported approach
