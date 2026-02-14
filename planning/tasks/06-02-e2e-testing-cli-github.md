# Task 6.2: E2E Testing — CLI → Heart → GitHub

> **Epic:** Integration, Docs & Polish
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 4.5, 2.9
> **Status:** Pending

## Goal
Write end-to-end tests that verify the full flow from CLI commands through the Heart REST API to real GitHub Issues.

## Background
This validates the second major usage path: a developer uses the `meridian` CLI, which calls the Heart's REST API, which operates on GitHub Issues. The tests verify that CLI commands produce correct results when connected to a real backend.

## Acceptance Criteria
- [ ] `meridian issues create` → issue appears on GitHub
- [ ] `meridian issues list` → returns issues from GitHub
- [ ] `meridian issues update` → issue changes on GitHub
- [ ] `meridian overview` → returns project data from GitHub
- [ ] All output formats work (table, JSON, plain)
- [ ] Error handling works end-to-end (invalid issue ID → clean CLI error)
- [ ] Tests clean up created issues after run

## Subtasks
- [ ] Set up test infrastructure: running Heart with GitHub adapter
- [ ] Write E2E test: `meridian issues create` → verify on GitHub
- [ ] Write E2E test: `meridian issues list` → verify results
- [ ] Write E2E test: `meridian issues update` → verify change
- [ ] Write E2E test: `meridian overview` → verify project data
- [ ] Write E2E test: output formats (JSON output parseable, plain output greppable)
- [ ] Write E2E test: error handling (404, connection refused)
- [ ] Add cleanup logic for test issues
- [ ] Add to CI as a separate job

## Notes
- CLI E2E tests can run the CLI binary as a subprocess and capture stdout/stderr
- JSON output format is easiest to assert against in tests
- Consider using a shared GitHub test repo with the MCP E2E tests (task 6.1) to reduce setup
- These tests validate success metric #2: "Own team uses meridian daily for project overview and task management"
