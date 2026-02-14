# Task 5.10: Write Adapter Integration Tests

> **Epic:** Meridian Tracker (Python)
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 5.7, 5.8
> **Status:** Pending

## Goal
Write integration tests that verify the Heart's adapter-local correctly communicates with the running Meridian Tracker API — end-to-end data flow through the adapter.

## Background
These tests verify the full integration: Heart adapter → HTTP → Tracker API → storage → response → mapper → domain model. They complement the unit tests (mocked HTTP) by testing with a real running Tracker instance. They also run the port interface compliance test suite to verify the adapter behaves identically to the in-memory and GitHub adapters.

## Acceptance Criteria
- [ ] Adapter creates issues on the Tracker and reads them back correctly
- [ ] Adapter lists issues with filters and pagination
- [ ] Adapter updates issues and verifies changes persist
- [ ] Adapter maps all entity types correctly (issues, projects, comments)
- [ ] Mapper round-trip tested: domain → tracker → domain (no data loss)
- [ ] Port interface compliance test suite passes against adapter-local
- [ ] Error handling tested: Tracker not running, not found, validation errors
- [ ] Tests start a real Tracker instance (or use a pre-started one)

## Subtasks
- [ ] Set up test infrastructure: start Tracker instance for tests
- [ ] Write integration tests for issue CRUD via adapter
- [ ] Write integration tests for project operations via adapter
- [ ] Write integration tests for comment operations via adapter
- [ ] Test filter and pagination forwarding
- [ ] Test mapper accuracy with various data shapes
- [ ] Run port interface compliance test suite against LocalIssueRepository
- [ ] Test error scenarios: connection refused, 404, 422
- [ ] Clean up test data after each test run
- [ ] Add to CI pipeline (may need Docker or subprocess for Tracker)

## Notes
- Starting the Tracker for tests: consider using a subprocess that starts `uvicorn` before tests and stops it after. Alternatively, use Docker Compose
- The port interface compliance test suite (from task 1.8) is the key assertion — if it passes, the adapter is interchangeable with in-memory and GitHub adapters
- Use a separate Tracker database for tests (SQLite file in temp directory) to avoid polluting any real data
- These tests validate the core architectural promise: swap `MERIDIAN_ADAPTER=github` to `MERIDIAN_ADAPTER=local` and everything works
