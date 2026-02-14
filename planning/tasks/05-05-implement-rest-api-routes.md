# Task 5.5: Implement REST API Routes

> **Epic:** Meridian Tracker (Python)
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 5.2, 5.3
> **Status:** Pending

## Goal
Implement the Tracker's REST API routes for issues, projects, and comments using FastAPI with Pydantic validation.

## Background
The Tracker's REST API serves two purposes: it's the interface the Heart's adapter-local connects to, and it can be used directly by developers who want to interact with the tracker standalone. FastAPI provides automatic request validation, response serialization, and OpenAPI documentation.

## Acceptance Criteria
- [ ] Issues: `POST /issues`, `GET /issues`, `GET /issues/{id}`, `PATCH /issues/{id}`, `DELETE /issues/{id}`
- [ ] Projects: `POST /projects`, `GET /projects`, `GET /projects/{id}`, `PATCH /projects/{id}`
- [ ] Comments: `POST /issues/{id}/comments`, `GET /issues/{id}/comments`, `DELETE /comments/{id}`
- [ ] Filter query params on list endpoints: status, priority, assignee, project_id
- [ ] Pagination: `offset` and `limit` query params with defaults
- [ ] Request validation via Pydantic schemas (automatic 422 on invalid input)
- [ ] Consistent JSON response format
- [ ] Storage backend injected via FastAPI dependency injection

## Subtasks
- [ ] Create FastAPI router for issues
- [ ] Create FastAPI router for projects
- [ ] Create FastAPI router for comments
- [ ] Implement issue endpoints with storage backend calls
- [ ] Implement project endpoints with storage backend calls
- [ ] Implement comment endpoints with storage backend calls
- [ ] Add filter query parameter parsing and validation
- [ ] Add pagination parameter parsing with defaults (limit=25, offset=0)
- [ ] Configure storage backend injection via FastAPI dependencies
- [ ] Add error handling: 404 for not found, 422 for validation errors
- [ ] Write endpoint tests using FastAPI's TestClient

## Notes
- FastAPI's TestClient (built on httpx) allows testing without starting a real server
- Use FastAPI's Depends() for storage backend injection — makes testing easy (swap in a test backend)
- The API URL structure should be simple and RESTful — no versioning prefix needed for the tracker (it's a simple standalone service)
- Consider adding `GET /projects/{id}/issues` as a convenience endpoint for listing project issues
