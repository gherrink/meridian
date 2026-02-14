# Task 1.4: Define Port Interfaces

> **Epic:** Core Domain & Foundation
> **Type:** Feature
> **Priority:** High
> **Effort:** Large (3-5 days)
> **Dependencies:** 1.3
> **Status:** Pending

## Goal
Define the port interfaces that form the contract between the domain layer and all backend adapters. Every adapter (GitHub, JIRA, local tracker) must implement these interfaces. This is the key abstraction that makes Meridian backend-agnostic.

## Background
In hexagonal architecture, ports are the interfaces that the domain layer defines and outbound adapters implement. The port interfaces determine what operations the system supports. They must be general enough for all backends but specific enough to be useful. Getting these right is critical — they're the contract that every adapter must fulfill, and changing them later affects all adapters.

## Acceptance Criteria
- [ ] `IIssueRepository` interface defined with full CRUD + query operations
- [ ] `IProjectRepository` interface defined with project management operations
- [ ] `ICommentRepository` interface defined with comment CRUD operations
- [ ] `IUserRepository` interface defined with user lookup operations
- [ ] All interfaces use domain model types (not backend-specific types)
- [ ] Filter and pagination types defined for list/query operations
- [ ] Return types use Result pattern or typed errors (not thrown exceptions)
- [ ] Interfaces are minimal — only what's needed for v1 use cases, not speculative
- [ ] Each interface method has JSDoc documentation explaining its contract

## Subtasks
- [ ] Define `IIssueRepository`: create, getById, update, delete, list (with filters), search
- [ ] Define `IProjectRepository`: getById, list, getOverview (aggregated project data)
- [ ] Define `ICommentRepository`: create, getByIssueId, update, delete
- [ ] Define `IUserRepository`: getById, getCurrent, search
- [ ] Define filter types: `IssueFilter` (status, priority, assignee, tags, date range)
- [ ] Define `PaginationParams` (offset/limit or cursor-based) and `PaginatedResult<T>`
- [ ] Define `SortOptions` for list operations
- [ ] Decide on error handling pattern: Result type vs typed exceptions
- [ ] Document each interface method with JSDoc (parameters, return type, error cases)
- [ ] Review interfaces against GitHub Issues API capabilities to ensure implementability
- [ ] Review interfaces against planned use cases to ensure completeness

## Notes
- Start minimal: only define methods needed by the v1 use cases (CreateIssue, UpdateIssue, ListIssues, GetProjectOverview, AssignIssue, UpdateStatus). Add methods as needed, not speculatively
- Consider using a Result type (e.g., `Result<T, DomainError>`) instead of thrown exceptions for predictable error handling across adapter boundaries
- Port interfaces live in the `core` package alongside the domain model
- These interfaces will be implemented by: in-memory adapters (task 1.5), GitHub adapter (epic 2), and local tracker adapter (epic 5)
