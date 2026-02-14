# Task 3.8: Add MCP Server to Composition Root

> **Epic:** MCP Server & Role Profiles
> **Type:** Feature
> **Priority:** High
> **Effort:** Small (< 1 day)
> **Dependencies:** 3.3, 3.4, 3.5, 2.9
> **Status:** Pending

## Goal
Wire the MCP server into the Heart's composition root so that a single Heart process starts both the MCP server and the REST API.

## Background
The Heart is a single process that exposes two inbound adapters: REST API (for CLI and external apps) and MCP server (for LLMs). The composition root (from task 2.9) currently only starts the REST API. This task adds MCP server startup alongside it, using the same use cases and adapters — no logic duplication.

## Acceptance Criteria
- [ ] Heart starts both REST API and MCP server from a single process
- [ ] Both servers share the same use case instances and adapter instances
- [ ] MCP transport mode configurable: stdio, http, or both
- [ ] Startup log shows MCP server status (transport mode, port if HTTP)
- [ ] Graceful shutdown stops both REST API and MCP server
- [ ] MCP server uses the same config and audit logger as REST API

## Subtasks
- [ ] Import MCP server factory into composition root
- [ ] Wire MCP server with use cases (same instances as REST API)
- [ ] Start MCP server based on `MCP_TRANSPORT` config (stdio, http, or both)
- [ ] Add MCP server to graceful shutdown handler
- [ ] Update startup log to show MCP server configuration
- [ ] Test: Heart starts with `MCP_TRANSPORT=stdio` (MCP on stdio, REST on HTTP)
- [ ] Test: Heart starts with `MCP_TRANSPORT=http` (MCP on HTTP, REST on HTTP)

## Notes
- When running in stdio mode, the MCP server and REST API coexist: MCP on stdin/stdout, REST on HTTP port
- When running in HTTP mode, MCP and REST are on different ports (configurable)
- Consider a `MCP_TRANSPORT=both` option for running both stdio and HTTP simultaneously
- The composition root should remain clean — adding MCP should be a few lines, not a restructuring
