# Task 2.5: Define REST API Routes

> **Epic:** GitHub Adapter & REST API
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 2.4, 1.6
> **Status:** Pending

## Goal
Define all v1 REST API routes with Zod request/response schemas using @hono/zod-openapi. Each route delegates to a domain use case — the route layer only handles HTTP concerns (parsing, validation, response formatting).

## Background
The REST API is the primary interface for the Go CLI and external applications. Routes are defined using @hono/zod-openapi, which means each route includes Zod schemas for request params, body, query, and response. These schemas automatically feed into the OpenAPI spec generation. The routes are thin — they validate input, call a use case, and format the response.

## Acceptance Criteria
- [ ] `POST /api/v1/issues` — create an issue (request body validated, returns created issue)
- [ ] `GET /api/v1/issues` — list issues with filter query params (status, priority, assignee, tags, pagination)
- [ ] `GET /api/v1/issues/:id` — get a single issue by ID
- [ ] `PATCH /api/v1/issues/:id` — update an issue (partial update, validated)
- [ ] `GET /api/v1/projects/:id/overview` — get project overview with aggregated data
- [ ] All routes have Zod schemas for request and response
- [ ] All routes delegate to use cases (no business logic in route handlers)
- [ ] Error responses follow consistent envelope format
- [ ] Query parameters for filtering and pagination are typed and validated

## Subtasks
- [ ] Define Zod schemas for issue creation request body
- [ ] Define Zod schemas for issue update request body (partial)
- [ ] Define Zod schemas for issue response (single and list)
- [ ] Define Zod schemas for project overview response
- [ ] Define Zod schemas for filter query parameters
- [ ] Define Zod schemas for pagination query parameters
- [ ] Implement `POST /api/v1/issues` route handler
- [ ] Implement `GET /api/v1/issues` route handler with filter/pagination
- [ ] Implement `GET /api/v1/issues/:id` route handler
- [ ] Implement `PATCH /api/v1/issues/:id` route handler
- [ ] Implement `GET /api/v1/projects/:id/overview` route handler
- [ ] Write route handler tests (use in-memory adapters for fast tests)

## Notes
- Route handlers should be ~10-20 lines: parse input, call use case, format response. If they're longer, business logic has leaked in
- Zod schemas defined here may share types with domain model schemas — consider re-exporting from core package to avoid duplication
- Pagination response should include: items, total count, offset, limit, has_more
- Consider adding `GET /api/v1/projects` (list projects) even though it's not explicitly in the roadmap — the CLI may need it
