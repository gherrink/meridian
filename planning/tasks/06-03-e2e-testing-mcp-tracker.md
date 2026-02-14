# Task 6.3: E2E Testing — MCP → Heart → Meridian Tracker

> **Epic:** Integration, Docs & Polish
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 3.8, 5.7
> **Status:** Pending

## Goal
Write end-to-end tests that verify the full flow from MCP tool calls through the Heart to the Meridian Tracker — proving that the adapter abstraction works across different backends.

## Background
This is the architectural validation test: the same MCP tools that work with GitHub should work identically with the Meridian Tracker. The only change is the adapter configuration (`MERIDIAN_ADAPTER=local`). If these tests pass alongside the GitHub E2E tests (task 6.1), it proves the adapter abstraction holds.

## Acceptance Criteria
- [ ] MCP tool call → create issue → issue stored in Tracker
- [ ] MCP tool call → list issues → returns issues from Tracker
- [ ] MCP tool call → update status → issue changes in Tracker
- [ ] MCP tool call → search issues → returns matching Tracker issues
- [ ] Same MCP tool calls produce equivalent results as GitHub E2E tests
- [ ] Config change only: switching from GitHub to Tracker adapter requires zero code changes
- [ ] Tests clean up created data after run

## Subtasks
- [ ] Set up test infrastructure: Heart with local adapter + running Tracker
- [ ] Configure Tracker with SQLite backend for test isolation
- [ ] Write E2E test: create issue via MCP → verify in Tracker
- [ ] Write E2E test: list issues via MCP → verify results from Tracker
- [ ] Write E2E test: update issue via MCP → verify change in Tracker
- [ ] Write E2E test: search issues via MCP → verify results
- [ ] Compare results structure with GitHub E2E tests (same domain types)
- [ ] Add cleanup: reset Tracker database between tests
- [ ] Add to CI pipeline

## Notes
- These tests are faster than GitHub E2E tests (no external API calls, everything local)
- Use a fresh SQLite database for each test run (or test suite) for isolation
- The key assertion: domain objects returned from Tracker adapter have the same shape as those from GitHub adapter
- This validates success metric #3: "Switching adapters requires only a config change — no code changes"
- Consider running these tests as part of the regular test suite (not just E2E) since they're fast
