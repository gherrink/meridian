# Task 5.6: Auto-Generate Tracker OpenAPI Spec

> **Epic:** Meridian Tracker (Python)
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 5.5
> **Status:** Pending

## Goal
Verify that FastAPI's auto-generated OpenAPI spec is accurate, complete, and suitable for consumption by the Heart's adapter-local.

## Background
FastAPI automatically generates an OpenAPI spec from route definitions and Pydantic schemas. This spec is served at `/docs` (Swagger UI) and `/redoc`, and available as JSON at `/openapi.json`. The Heart's adapter-local will use this API — the spec serves as the contract between the two systems.

## Acceptance Criteria
- [ ] OpenAPI spec available at `/openapi.json`
- [ ] Swagger UI available at `/docs`
- [ ] All routes present in the spec with correct request/response schemas
- [ ] Schema names are descriptive (not auto-generated hashes)
- [ ] Spec includes proper metadata (title: "Meridian Tracker", version, description)
- [ ] Spec validated against OpenAPI standard (no errors)
- [ ] Filter and pagination parameters documented in the spec

## Subtasks
- [ ] Review auto-generated spec for completeness
- [ ] Add API metadata (title, version, description) to FastAPI app
- [ ] Ensure Pydantic schemas have descriptive names (use `model_config` if needed)
- [ ] Verify all endpoints appear with correct HTTP methods
- [ ] Verify request body schemas match actual validation
- [ ] Verify response schemas match actual response shapes
- [ ] Test Swagger UI works for interactive API exploration
- [ ] Export spec as JSON file for reference

## Notes
- FastAPI's auto-generation is usually accurate, but edge cases exist: optional fields, union types, nested models
- Named Pydantic models produce cleaner schema names than inline definitions
- The spec should be exported and reviewed before building the Heart adapter — it's the contract
- Consider adding example values to Pydantic schemas (via `model_config` or `Field(examples=[...])`) for richer Swagger UI experience
