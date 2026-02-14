# Task 1.3: Design Domain Model Entities

> **Epic:** Core Domain & Foundation
> **Type:** Feature
> **Priority:** High
> **Effort:** Large (3-5 days)
> **Dependencies:** 1.1, 1.2
> **Status:** Pending

## Goal
Design and implement the core domain model entities that represent the unified issue tracking abstraction. These entities are the foundation everything else maps to — adapters translate external data into these types, and all use cases operate on them.

## Background
The domain model must be general enough to represent issues from GitHub Issues, JIRA, and the local Meridian Tracker, while being specific enough to be useful. The design follows Apideck's proven unified model as a reference, with extension points (`metadata` field) for backend-specific data. All entities are validated with Zod schemas, which propagate to MCP tool validation, REST API validation, and OpenAPI spec generation.

## Acceptance Criteria
- [ ] All core entities defined with Zod schemas: Issue, Epic, Project, Comment, User, Status, Priority, Tag
- [ ] Value objects for IDs, timestamps, and constrained types
- [ ] Status enum covers a canonical set that maps to all backends (e.g., open, in_progress, closed)
- [ ] Priority enum with ordered levels (e.g., low, normal, high, urgent)
- [ ] `metadata` extension field on Issue and Project for backend-specific data
- [ ] Domain error types defined (NotFoundError, ValidationError, ConflictError, AuthorizationError)
- [ ] Entities are pure data — no framework dependencies, no side effects
- [ ] Zod schemas export both types and runtime validators
- [ ] Model validated against GitHub Issues and JIRA data models to ensure mapping feasibility

## Subtasks
- [ ] Study Apideck's unified issue tracking data model for reference
- [ ] Define Issue entity (id, title, description, status, priority, assignees, tags, due_date, metadata, timestamps)
- [ ] Define Epic entity (id, title, description, issues, status, metadata)
- [ ] Define Project entity (id, name, description, metadata)
- [ ] Define Comment entity (id, body, author, issue_id, timestamps)
- [ ] Define User entity (id, name, email, avatar_url)
- [ ] Define Status, Priority, and Tag value objects/enums
- [ ] Define ID value objects with type branding (IssueId, ProjectId, etc.)
- [ ] Add `metadata: Record<string, unknown>` extension field to Issue and Project
- [ ] Define domain error types with consistent structure
- [ ] Define filter/query types (IssueFilter, PaginationParams, SortOptions)
- [ ] Validate model against GitHub Issues data model (issues, milestones, labels, projects)
- [ ] Validate model against JIRA data model (issues, epics, sprints, projects) for future compatibility
- [ ] Write unit tests for Zod schema validation (valid/invalid inputs)

## Notes
- Keep the model as a "smart core" — avoid lowest-common-denominator. Use the `metadata` field for things that don't have unified equivalents
- Status mapping is the hardest part: GitHub has open/closed, JIRA has configurable workflows. The canonical set should cover the common cases, with adapters mapping edge cases
- All Zod schemas live in the `core` package — they are the single source of truth
- TypeScript strict mode must be enabled — no `any` types in the domain model
