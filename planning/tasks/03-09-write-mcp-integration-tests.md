# Task 3.9: Write MCP Integration Tests

> **Epic:** MCP Server & Role Profiles
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 3.2, 3.3, 3.4, 3.5
> **Status:** Pending

## Goal
Write comprehensive integration tests for the MCP server — testing tool discovery, tool execution, role filtering, and error handling using a mock MCP client.

## Background
MCP integration tests verify that the server behaves correctly from a client's perspective: tools are discoverable, inputs are validated, handlers execute correctly, and responses are well-formed. Tests use the MCP SDK's test client to simulate real client interactions against the server backed by in-memory adapters.

## Acceptance Criteria
- [ ] All PM tools callable and returning correct results
- [ ] All Dev tools callable and returning correct results
- [ ] All shared tools callable and returning correct results
- [ ] Role filtering tested: PM filter → only PM + shared tools visible
- [ ] Role filtering tested: Dev filter → only Dev + shared tools visible
- [ ] Role filtering tested: no filter → all tools visible
- [ ] Input validation tested: invalid inputs return clear error responses
- [ ] Error handling tested: domain errors propagate as MCP errors
- [ ] Tool descriptions present and non-empty for all tools
- [ ] Tests use in-memory adapters for speed

## Subtasks
- [ ] Set up MCP test client using the SDK's testing utilities
- [ ] Create test helper: MCP server with in-memory adapters and seed data
- [ ] Test tool discovery: `tools/list` returns all expected tools
- [ ] Test each PM tool: call with valid input, verify response
- [ ] Test each Dev tool: call with valid input, verify response
- [ ] Test each shared tool: call with valid input, verify response
- [ ] Test role filtering: verify tool visibility changes with different filters
- [ ] Test input validation: call tools with missing/invalid params
- [ ] Test error scenarios: operations on non-existent resources
- [ ] Verify response format: structured text, not raw JSON

## Notes
- The MCP SDK may provide a test client or testing utilities — check the SDK documentation
- If no test client is available, mock the transport layer (stdin/stdout pipes for stdio transport)
- Test tool descriptions are clear by checking they contain expected keywords
- These tests complement the unit tests in individual tool tasks (3.3, 3.4, 3.5) by testing the full MCP protocol flow
