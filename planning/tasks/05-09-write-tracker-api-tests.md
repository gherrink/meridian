# Task 5.9: Write Tracker API Tests

> **Epic:** Meridian Tracker (Python)
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 5.3, 5.4, 5.5
> **Status:** Pending

## Goal
Write comprehensive pytest tests for the Tracker's REST API, covering both SQLite and flat file storage backends.

## Background
The Tracker's tests verify that the API works correctly with both storage backends. FastAPI's TestClient (built on httpx) allows testing without starting a real server. Tests should be parameterized to run the same test suite against both SQLite (in-memory) and flat file (temp directory) backends.

## Acceptance Criteria
- [ ] All issue endpoints tested: create, get, list, update, delete
- [ ] All project endpoints tested: create, get, list, update
- [ ] All comment endpoints tested: create, get by issue, delete
- [ ] Filtering tested: single filter, multiple filters, no results
- [ ] Pagination tested: defaults, custom values, edge cases
- [ ] Validation tested: missing required fields, invalid enum values
- [ ] Error handling tested: not found (404), validation error (422)
- [ ] Tests run against BOTH storage backends (parameterized)
- [ ] Tests complete in under 10 seconds
- [ ] `uv run pytest` passes with all tests green

## Subtasks
- [ ] Set up test fixtures with FastAPI TestClient
- [ ] Create parameterized test configuration for both storage backends
- [ ] Write issue CRUD tests
- [ ] Write project CRUD tests
- [ ] Write comment CRUD tests
- [ ] Write filter and pagination tests
- [ ] Write validation error tests
- [ ] Write 404 not-found tests
- [ ] Configure SQLite in-memory backend for tests
- [ ] Configure temp directory flat file backend for tests
- [ ] Add test coverage reporting

## Notes
- Use pytest fixtures for test client setup and cleanup
- Parameterize with `@pytest.mark.parametrize` or `conftest.py` fixtures that yield both backend types
- SQLite in-memory (`:memory:`) is the fastest backend for testing
- Flat file tests should use `tmp_path` fixture (pytest auto-cleanup)
- Consider testing concurrent access scenarios for the flat file backend
