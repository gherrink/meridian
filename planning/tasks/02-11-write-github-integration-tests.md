# Task 2.11: Write GitHub Integration Tests

> **Epic:** GitHub Adapter & REST API
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Medium (1-3 days)
> **Dependencies:** 2.9
> **Status:** Pending

## Goal
Write integration tests that verify the GitHub adapter works against the real GitHub API, and mock-based tests using MSW for reliable CI testing without rate limit concerns.

## Background
Integration tests validate that the GitHub adapter correctly communicates with the real GitHub API — that request formatting, response parsing, and error handling all work in practice. However, real API tests are slow and subject to rate limiting. The strategy is two-tier: MSW (Mock Service Worker) tests for CI (fast, reliable), and real API tests for periodic validation (against a dedicated test repo).

## Acceptance Criteria
- [ ] MSW-based tests mock GitHub API responses for all adapter operations
- [ ] MSW tests cover: create issue, get issue, update issue, list issues, search
- [ ] MSW tests cover error scenarios: 404, 401, 403, 422, 429 (rate limit)
- [ ] Real GitHub API tests (opt-in) work against a dedicated test repository
- [ ] Real tests create, read, update, and list issues on the test repo
- [ ] Real tests clean up after themselves (delete/close test issues)
- [ ] CI runs MSW tests by default; real API tests run on a separate trigger
- [ ] Test configuration: test repo details via environment variables

## Subtasks
- [ ] Set up MSW for intercepting Octokit HTTP requests
- [ ] Create GitHub API response fixtures (from real API responses)
- [ ] Write MSW-based tests for all `GitHubIssueRepository` methods
- [ ] Write MSW-based tests for all `GitHubProjectRepository` methods
- [ ] Write MSW tests for error handling (rate limiting, auth failures, not found)
- [ ] Create dedicated GitHub test repository for real API tests
- [ ] Write real API integration tests (guarded by `GITHUB_TEST_REPO` env var)
- [ ] Add cleanup logic to real API tests (close/delete test issues)
- [ ] Add CI configuration: MSW tests in main pipeline, real API tests as separate job
- [ ] Run the port interface compliance test suite (from 1.8) against the GitHub adapter

## Notes
- MSW is the preferred mocking approach because it intercepts at the HTTP level — Octokit doesn't know it's being mocked, so we test the full adapter stack
- Real API tests should only run in CI with a dedicated PAT (not a developer's personal token)
- Use unique identifiers (timestamps, UUIDs) in test issue titles to avoid collisions
- Rate limiting: add appropriate delays between real API calls if needed
- The port interface compliance test suite from task 1.8 should be run against the GitHub adapter to verify it behaves identically to the in-memory adapter
