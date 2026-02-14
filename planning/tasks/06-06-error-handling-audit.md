# Task 6.6: Error Handling Audit

> **Epic:** Integration, Docs & Polish
> **Type:** Refactor
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 3.8, 2.9
> **Status:** Pending

## Goal
Audit and improve error handling across all layers — ensuring that errors propagate cleanly from adapters through use cases to consumers (REST API and MCP server) with actionable messages.

## Background
Clean error handling is a quality hallmark. Errors can originate at any layer: external API failures, validation errors, not-found conditions, auth failures, connection issues. They must propagate through the system without losing context, and arrive at the consumer as clear, actionable messages — not stack traces or generic "Internal Server Error" responses.

## Acceptance Criteria
- [ ] All error types have clear, actionable messages
- [ ] REST API errors include: HTTP status code, error code, human-readable message
- [ ] MCP errors include: error type, clear description, context
- [ ] Adapter errors (GitHub API, Tracker API) are translated to domain errors (not leaked)
- [ ] Connection errors produce helpful messages ("Cannot reach GitHub API" not "ECONNREFUSED")
- [ ] Validation errors list specific field issues
- [ ] No stack traces or raw exceptions in consumer-facing error responses
- [ ] Error handling is consistent between REST API and MCP server

## Subtasks
- [ ] Catalog all error paths: adapter failures, validation, not found, auth, connection
- [ ] Test each error path through REST API — verify response format
- [ ] Test each error path through MCP server — verify error format
- [ ] Review adapter error translation: GitHub API errors → domain errors
- [ ] Review adapter error translation: Tracker API errors → domain errors
- [ ] Improve error messages where needed (replace generic messages with specific ones)
- [ ] Ensure connection errors have helpful messages
- [ ] Ensure validation errors list affected fields
- [ ] Verify no stack traces leak to consumers
- [ ] Update error handling middleware if needed

## Notes
- This is a cross-cutting audit — errors touch every layer. Work systematically from the outside in: consumer → API → use case → adapter → external
- Common issues to check: raw `Error` objects passing through without mapping, generic catch-all handlers hiding specific errors, adapter-specific error types leaking to consumers
- Error messages should help the user fix the problem — "GitHub token expired, please update GITHUB_TOKEN" not "401 Unauthorized"
- Consider creating an error catalog document listing all error codes and their meanings
