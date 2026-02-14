# Task 5.3: Implement SQLite Storage Backend

> **Epic:** Meridian Tracker (Python)
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 5.2
> **Status:** Pending

## Goal
Implement the primary SQLite storage backend for the Meridian Tracker using SQLModel and SQLAlchemy.

## Background
SQLite is the primary storage option — zero-config, file-based, and Python has native support. SQLModel (built on SQLAlchemy) handles the ORM layer. The storage backend implements a repository interface so it can be swapped with the flat file backend (task 5.4) without changing the rest of the application.

## Acceptance Criteria
- [ ] SQLite database created and initialized with schema on first run
- [ ] CRUD operations for Issues: create, get by id, update, delete, list with filters
- [ ] CRUD operations for Projects: create, get by id, update, list
- [ ] CRUD operations for Comments: create, get by issue, update, delete
- [ ] Filtering: status, priority, assignee, tags, project
- [ ] Pagination: offset/limit support on list operations
- [ ] Database path configurable via `TRACKER_DB_PATH` environment variable
- [ ] Storage interface defined that both SQLite and flat file backends implement
- [ ] Migrations strategy: at minimum, auto-create tables on startup

## Subtasks
- [ ] Define storage repository interfaces (IssueStorage, ProjectStorage, CommentStorage)
- [ ] Configure SQLModel engine with SQLite
- [ ] Implement database initialization (create tables on startup)
- [ ] Implement issue CRUD operations
- [ ] Implement project CRUD operations
- [ ] Implement comment CRUD operations
- [ ] Implement filtering logic for issue listing
- [ ] Implement pagination (offset/limit)
- [ ] Add database path configuration
- [ ] Write tests for all CRUD operations
- [ ] Test filtering and pagination edge cases

## Notes
- Define a clear storage interface that both SQLite and flat file backends implement — this is the tracker's own internal ports/adapters pattern
- SQLAlchemy's session management: use dependency injection in FastAPI to provide sessions per request
- SQLite WAL mode should be enabled for better concurrent read performance
- For v1, table auto-creation on startup is sufficient. For v2+, consider Alembic for proper migrations
- Test with an in-memory SQLite database (`:memory:`) for speed
