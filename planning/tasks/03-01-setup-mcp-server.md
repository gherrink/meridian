# Task 3.1: Set Up MCP Server

> **Epic:** MCP Server & Role Profiles
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 1.1, 1.6
> **Status:** Pending

## Goal
Set up the base MCP server in the `mcp-server` package using @modelcontextprotocol/sdk. This creates the server infrastructure that tools will be registered on — tool registration, request handling, and the connection lifecycle.

## Background
The MCP server is one of two inbound adapters (alongside REST). It exposes domain use cases as MCP tools that LLMs (like Claude Code) can discover and invoke. The server uses the official TypeScript MCP SDK (v1 stable). Tools are registered with schemas (Zod), descriptions, and handlers. The server supports both stdio and HTTP transports (configured separately in tasks 3.6 and 3.7).

## Acceptance Criteria
- [ ] MCP server created using @modelcontextprotocol/sdk
- [ ] Server metadata configured (name: "meridian", version, capabilities)
- [ ] Tool registration infrastructure in place (register tool with schema, description, handler)
- [ ] Tool handlers receive validated input and return structured MCP responses
- [ ] Server accepts use cases via dependency injection (not global imports)
- [ ] At least one placeholder tool registered and callable (e.g., `health-check`)
- [ ] Server exported as factory function for composition root integration

## Subtasks
- [ ] Install @modelcontextprotocol/sdk in `mcp-server` package
- [ ] Create MCP server factory function with dependency injection for use cases
- [ ] Configure server metadata (name, version, protocol version)
- [ ] Implement tool registration helper that wraps Zod schemas for MCP SDK
- [ ] Implement response formatting helper (domain results → MCP tool response)
- [ ] Implement error formatting (domain errors → MCP error responses)
- [ ] Register a placeholder `health-check` tool to verify the pipeline works
- [ ] Write tests for tool registration and response formatting

## Notes
- The MCP SDK uses Zod for tool input schemas — since the domain model already uses Zod, schemas can be shared or derived
- MCP tool responses are typically text content (JSON stringified results) — the formatting helper should produce clean, readable output for LLMs
- Tool descriptions are critical for LLM usability — they should be clear, specific, and include example inputs where helpful
- The server factory function should accept: use cases, config (transport, role filter settings)
