# Task 2.6: Auto-Generate OpenAPI Spec

> **Epic:** GitHub Adapter & REST API
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 2.5
> **Status:** Pending

## Goal
Verify and configure the auto-generated OpenAPI 3.1 spec from the Hono routes, and serve interactive API documentation. This spec is the contract that drives Go CLI client generation.

## Background
@hono/zod-openapi automatically generates an OpenAPI spec from route definitions and Zod schemas. This spec must be accurate and complete because it's used to generate the Go CLI's API client (via oapi-codegen in Epic 4). The spec should also be served as interactive documentation for developers.

## Acceptance Criteria
- [ ] OpenAPI 3.1 spec auto-generated from Hono routes
- [ ] Spec includes all routes with correct request/response schemas
- [ ] Spec exported as JSON file during build (for Go client generation)
- [ ] Interactive API docs served at `/api/docs` (Scalar or Swagger UI)
- [ ] Spec includes proper metadata (title, version, description, servers)
- [ ] All schema types have descriptive names (not auto-generated hashes)
- [ ] Spec validated against OpenAPI 3.1 standard (no errors or warnings)

## Subtasks
- [ ] Configure @hono/zod-openapi spec metadata (title: "Meridian Heart API", version, etc.)
- [ ] Add a spec export endpoint or build script that writes `openapi.json`
- [ ] Set up Scalar or Swagger UI for interactive documentation
- [ ] Validate generated spec with an OpenAPI linter
- [ ] Verify all routes appear in the spec with correct schemas
- [ ] Add Turborepo script: `turbo generate:openapi` to export spec during build
- [ ] Test that the generated spec can be consumed by oapi-codegen (dry run)

## Notes
- The spec file (`openapi.json`) should be committed to the repo or generated as a build artifact — the Go CLI needs it for client generation
- Scalar is a modern alternative to Swagger UI with better DX — consider it first
- Named Zod schemas (using `.openapi()` method) produce cleaner spec output than anonymous schemas
- This spec is the contract between the Heart and the Go CLI — breaking changes here break the CLI
