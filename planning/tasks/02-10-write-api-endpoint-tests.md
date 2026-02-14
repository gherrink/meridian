# Task 2.10: Write API Endpoint Tests

> **Epic:** GitHub Adapter & REST API
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 2.5, 1.5
> **Status:** Pending

## Goal
Write comprehensive tests for all REST API endpoints using in-memory adapters. These tests verify the full HTTP layer — request parsing, validation, use case delegation, response formatting, and error handling — without hitting any external APIs.

## Background
API endpoint tests are the primary test suite for the REST layer. They use in-memory adapters (from task 1.5) as the backend, making them fast and deterministic. They test everything from Zod validation to response formatting to error handling middleware. Integration tests against real GitHub (task 2.11) are separate and run less frequently.

## Acceptance Criteria
- [ ] All REST routes have test coverage for happy path
- [ ] All REST routes have test coverage for error paths (not found, validation error, auth error)
- [ ] Request validation tested: missing fields, invalid types, extra fields
- [ ] Query parameter filtering tested: single filter, multiple filters, no filters
- [ ] Pagination tested: default values, custom offset/limit, beyond total count
- [ ] Response format tested: correct envelope structure, correct HTTP status codes
- [ ] Error response format tested: consistent error envelope with message and code
- [ ] Tests run against Hono's test client (no real HTTP server needed)
- [ ] Tests complete in under 5 seconds

## Subtasks
- [ ] Set up test helper: create Hono app with in-memory adapters and seed data
- [ ] Test `POST /api/v1/issues`: valid creation, missing fields, invalid data
- [ ] Test `GET /api/v1/issues`: no filters, with filters, empty results, pagination
- [ ] Test `GET /api/v1/issues/:id`: existing issue, non-existent issue
- [ ] Test `PATCH /api/v1/issues/:id`: valid update, invalid data, non-existent issue
- [ ] Test `GET /api/v1/projects/:id/overview`: existing project, non-existent project
- [ ] Test `GET /api/v1/health`: returns 200 with status
- [ ] Test error handling middleware: domain errors → correct HTTP status codes
- [ ] Test audit logging middleware: verify log calls are made

## Notes
- Use Hono's built-in test client (`app.request()`) — no need to start a real HTTP server
- Seed in-memory adapters with predictable test data at the start of each test
- Consider using test fixtures for common request/response shapes
- These tests are the first line of defense for API contract changes — they should catch any breaking changes immediately
