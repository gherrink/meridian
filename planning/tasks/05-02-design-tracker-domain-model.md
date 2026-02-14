# Task 5.2: Design Tracker Domain Model

> **Epic:** Meridian Tracker (Python)
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 5.1
> **Status:** Pending

## Goal
Design the tracker's own domain model entities using Pydantic and SQLModel. The tracker has its own data model, separate from the Heart's — the Heart adapter handles translation between the two.

## Background
The Meridian Tracker is a standalone application with its own domain model. While the model is intentionally similar to the Heart's unified model (to minimize mapping complexity), it's independent and may diverge. The model uses SQLModel, which combines SQLAlchemy (database mapping) and Pydantic (validation) in a single class hierarchy.

## Acceptance Criteria
- [ ] Issue model: id, title, description, status, priority, assignee, tags, created_at, updated_at
- [ ] Project model: id, name, description, created_at
- [ ] Comment model: id, body, author, issue_id, created_at
- [ ] User model: id, name, email
- [ ] Tag model: id, name (many-to-many with issues)
- [ ] Status enum: open, in_progress, review, closed
- [ ] Priority enum: low, normal, high, urgent
- [ ] SQLModel models (for database) and Pydantic schemas (for API) separated
- [ ] Relationships defined: Issue belongs to Project, Comment belongs to Issue
- [ ] Validation rules on all models (required fields, string lengths, enum values)

## Subtasks
- [ ] Define SQLModel database models (Issue, Project, Comment, User, Tag)
- [ ] Define Pydantic API schemas (IssueCreate, IssueUpdate, IssueResponse, etc.)
- [ ] Define status and priority enums
- [ ] Define model relationships (foreign keys, many-to-many for tags)
- [ ] Add validation rules (title required, max lengths, valid enums)
- [ ] Add timestamp fields with auto-generation (created_at, updated_at)
- [ ] Write tests for model validation (valid/invalid inputs)
- [ ] Document differences between tracker model and Heart's unified model

## Notes
- SQLModel classes serve double duty: database table definitions AND Pydantic validation. Use inheritance to separate DB models from API schemas: `IssueBase` (shared fields) → `Issue` (DB model with id, timestamps) → `IssueCreate` (API input without id)
- Keep the model simple: no workflows, no custom fields, no permissions. The tracker is a CRUD storage backend, not a full PM tool
- The model should be close to the Heart's unified model to minimize mapping complexity in the adapter (task 5.8)
- Consider adding a `source` field for future multi-source tracking (deferred to v2+)
