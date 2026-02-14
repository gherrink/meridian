# Task 1.8: Write Comprehensive Domain Tests

> **Epic:** Core Domain & Foundation
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 1.5, 1.6
> **Status:** Pending

## Goal
Write a comprehensive test suite for the domain layer — model validation, port interface contracts, and use case behavior. Target 90%+ coverage on the domain layer. This test suite is the safety net for the entire project.

## Background
The domain layer is the most critical part of Meridian — every adapter, every API endpoint, and every MCP tool depends on it. High test coverage here catches bugs before they propagate. Tests use in-memory adapters (from task 1.5) for speed and reliability. Some tests written during earlier tasks (1.3, 1.5, 1.6) may already exist — this task fills gaps and ensures comprehensive coverage.

## Acceptance Criteria
- [ ] 90%+ code coverage on the `core` package domain layer
- [ ] All Zod schemas tested with valid and invalid inputs
- [ ] All domain error types tested for correct construction and messages
- [ ] All port interface methods tested via in-memory adapters
- [ ] All use cases tested for happy path and error paths
- [ ] Edge cases covered: empty lists, pagination boundaries, filter combinations, concurrent operations
- [ ] Port interface compliance test suite that can be reused against real adapters
- [ ] Tests run in < 10 seconds (fast feedback loop)
- [ ] `turbo test` passes with coverage report

## Subtasks
- [ ] Audit existing tests from tasks 1.3, 1.5, 1.6 — identify coverage gaps
- [ ] Add schema validation tests: boundary values, missing fields, extra fields, type coercion
- [ ] Add domain error tests: each error type with correct codes and messages
- [ ] Add filter combination tests: multiple filters, no filters, conflicting filters
- [ ] Add pagination edge cases: offset beyond total, limit of 0, negative values
- [ ] Add use case error path tests: not found, validation failure, conflict
- [ ] Create reusable port interface compliance test suite (can be imported by adapter test files)
- [ ] Configure Vitest coverage reporting (c8 or istanbul)
- [ ] Verify coverage meets 90% threshold on domain layer

## Notes
- The "port interface compliance test suite" is a key deliverable — it's a set of tests that verify any adapter implementation behaves correctly. When the GitHub adapter or local tracker adapter is built, they can import this suite and run it against their implementation.
- Focus on behavior, not implementation — test what the use case does, not how it does it
- Keep tests fast: no real I/O, no network, no file system
- Consider property-based testing for schema validation (e.g., fast-check) if Zod schemas are complex
