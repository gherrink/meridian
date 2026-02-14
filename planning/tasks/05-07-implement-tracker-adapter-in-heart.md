# Task 5.7: Implement Tracker Adapter in Heart

> **Epic:** Meridian Tracker (Python)
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 1.4, 5.6
> **Status:** Pending

## Goal
Implement the Heart's adapter-local package that connects to the Meridian Tracker's REST API, implementing the port interfaces (IIssueRepository, IProjectRepository) via HTTP calls.

## Background
The adapter-local is a TypeScript package in the Heart monorepo. It implements the same port interfaces as the GitHub adapter, but instead of calling the GitHub API, it calls the Meridian Tracker's FastAPI REST API. The Heart treats the tracker as "just another backend" — the use cases and MCP/REST layers don't know or care which adapter is active.

## Acceptance Criteria
- [ ] `LocalIssueRepository` implements `IIssueRepository` via HTTP calls to Tracker API
- [ ] `LocalProjectRepository` implements `IProjectRepository` via HTTP calls to Tracker API
- [ ] CRUD operations mapped to Tracker API endpoints
- [ ] Filtering and pagination parameters forwarded to Tracker API
- [ ] Tracker API errors mapped to domain errors
- [ ] Tracker URL configurable (defaults to `http://localhost:3002`)
- [ ] Uses mappers from task 5.8 for data translation
- [ ] HTTP client injected for testability (not hardcoded fetch)

## Subtasks
- [ ] Create `adapter-local` package in Heart monorepo
- [ ] Implement `LocalIssueRepository` with HTTP client
- [ ] Implement `LocalProjectRepository` with HTTP client
- [ ] Map Tracker API endpoints to port interface methods
- [ ] Forward filter/pagination parameters as query params
- [ ] Handle Tracker API errors (connection refused, 404, 422, 500) → domain errors
- [ ] Add Tracker URL configuration
- [ ] Write unit tests with mocked HTTP responses
- [ ] Run port interface compliance test suite against local adapter

## Notes
- Use Node.js built-in `undici` (or `fetch`) for HTTP calls — no additional HTTP client library needed
- The adapter connects to the tracker over HTTP, even when both run on the same machine — this is intentional for clean decoupling
- Connection error handling is important: the tracker may not be running. Map connection refused → clear error message
- This is the second adapter implementing the port interfaces — it validates that the abstraction works across different backends
- Running the port interface compliance test suite (from task 1.8) against this adapter proves interchangeability
