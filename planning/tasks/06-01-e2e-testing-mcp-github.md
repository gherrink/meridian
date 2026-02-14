# Task 6.1: E2E Testing — LLM → MCP → Heart → GitHub

> **Epic:** Integration, Docs & Polish
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 3.8, 2.1
> **Status:** Pending

## Goal
Write end-to-end tests that verify the full flow from MCP tool calls through the Heart to real GitHub Issues — creating, listing, updating, and searching issues on a real GitHub repository.

## Background
This is the primary success path for Meridian: an LLM calls MCP tools, the Heart processes them, and GitHub issues are created/modified. E2E tests verify this entire chain works — MCP protocol, use cases, GitHub adapter, and mapper all functioning together. These tests use a dedicated GitHub test repository.

## Acceptance Criteria
- [ ] MCP tool call → create issue → issue appears on GitHub
- [ ] MCP tool call → list issues → returns issues from GitHub
- [ ] MCP tool call → update status → issue status changes on GitHub
- [ ] MCP tool call → search issues → returns matching GitHub issues
- [ ] MCP tool call → project overview → returns aggregated data from GitHub
- [ ] Role filtering works end-to-end (PM tools filtered for PM profile)
- [ ] Error handling works end-to-end (tool call for non-existent issue → clean MCP error)
- [ ] Tests clean up created issues after run

## Subtasks
- [ ] Set up test infrastructure: Heart with GitHub adapter + MCP server
- [ ] Configure dedicated GitHub test repository
- [ ] Write E2E test: create issue via MCP → verify on GitHub
- [ ] Write E2E test: list issues via MCP → verify results match GitHub
- [ ] Write E2E test: update issue via MCP → verify change on GitHub
- [ ] Write E2E test: search issues via MCP → verify results
- [ ] Write E2E test: project overview via MCP → verify aggregation
- [ ] Write E2E test: role filtering → verify tool visibility
- [ ] Add cleanup: close/delete test issues after each test
- [ ] Add to CI as a separate job (requires GitHub PAT secret)

## Notes
- E2E tests are slow and expensive — run them in CI on PRs to main, not on every push
- Use unique test issue titles (include timestamp or UUID) to avoid conflicts with parallel test runs
- GitHub API rate limiting: add appropriate delays and use a dedicated test PAT
- Consider recording/replaying API responses for faster local development runs
- These tests validate success metric #1: "Claude Code can create/list/update issues on GitHub through the MCP server"
