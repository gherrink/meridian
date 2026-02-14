# Task 2.4: Set Up Hono REST API

> **Epic:** GitHub Adapter & REST API
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 1.1
> **Status:** Pending

## Goal
Set up the Hono REST API framework in the `rest-api` package with @hono/zod-openapi integration, middleware stack, and base configuration. This is the foundation for all REST endpoints.

## Background
Hono is a lightweight, high-performance web framework with native Zod integration via @hono/zod-openapi. This lets route definitions include Zod schemas for request validation and response typing, which automatically generates the OpenAPI spec. The REST API is one of two inbound adapters (the other being MCP) and serves the Go CLI, external apps, and any HTTP client.

## Acceptance Criteria
- [ ] Hono app created in the `rest-api` package with @hono/zod-openapi
- [ ] Error handling middleware: catches errors, returns consistent JSON error responses
- [ ] Audit logging middleware: logs all requests with method, path, status, duration
- [ ] CORS middleware configured for development
- [ ] Health check endpoint: `GET /api/v1/health` returns 200 with status info
- [ ] API versioning via URL prefix (`/api/v1/`)
- [ ] Consistent JSON response envelope (data, error, pagination)
- [ ] Hono app exported for use by the composition root (not self-starting)

## Subtasks
- [ ] Install Hono 4.x and @hono/zod-openapi in `rest-api` package
- [ ] Create Hono app with OpenAPI configuration
- [ ] Implement error handling middleware (domain errors → HTTP status codes)
- [ ] Implement audit logging middleware (integrate with Pino logger from shared package)
- [ ] Implement CORS middleware
- [ ] Define standard response envelope types (success, error, paginated)
- [ ] Implement `GET /api/v1/health` endpoint
- [ ] Export app factory function (receives dependencies, returns configured Hono app)
- [ ] Write tests for middleware behavior (error handling, audit logging)

## Notes
- The Hono app should NOT start its own HTTP server — the composition root (heart package) handles that
- The app factory function receives use cases and config as parameters (dependency injection)
- Error handling middleware should map domain error types to HTTP status codes: NotFoundError → 404, ValidationError → 422, ConflictError → 409, AuthorizationError → 401
- Keep the middleware stack lean — Hono's performance advantage comes from minimal overhead
