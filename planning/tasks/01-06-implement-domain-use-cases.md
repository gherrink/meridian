# Task 1.6: Implement Domain Use Cases

> **Epic:** Core Domain & Foundation
> **Type:** Feature
> **Priority:** High
> **Effort:** Large (3-5 days)
> **Dependencies:** 1.4, 1.5
> **Status:** Pending

## Goal
Implement the core domain use cases that encapsulate all business logic. Use cases are the application's "actions" — they orchestrate domain operations, call port interfaces, and enforce business rules. Both the MCP server and REST API will delegate to these use cases.

## Background
Use cases sit between inbound adapters (MCP, REST) and outbound adapters (GitHub, local tracker) in the hexagonal architecture. They receive validated input, execute business logic, call port interfaces, trigger audit logging, and return domain objects. They never know about HTTP, MCP, or specific backends — they only work with domain types and port interfaces.

## Acceptance Criteria
- [ ] `CreateIssue` use case: validates input, creates issue via port, returns created issue
- [ ] `UpdateIssue` use case: validates changes, updates via port, returns updated issue
- [ ] `ListIssues` use case: accepts filters/pagination, delegates to port, returns paginated results
- [ ] `GetProjectOverview` use case: aggregates project data (issue counts, status breakdown, milestones)
- [ ] `AssignIssue` use case: validates assignee, updates assignment via port
- [ ] `UpdateStatus` use case: validates status transition, updates via port
- [ ] All use cases accept port interfaces via constructor injection (dependency inversion)
- [ ] All use cases have audit logging integration points
- [ ] All use cases return typed results (not thrown exceptions) for error cases
- [ ] All use cases tested against in-memory adapters

## Subtasks
- [ ] Define use case input/output types (DTOs) separate from domain entities
- [ ] Implement `CreateIssue` use case with input validation
- [ ] Implement `UpdateIssue` use case with partial update support
- [ ] Implement `ListIssues` use case with filter and pagination delegation
- [ ] Implement `GetProjectOverview` use case with data aggregation logic
- [ ] Implement `AssignIssue` use case with assignee validation
- [ ] Implement `UpdateStatus` use case with status transition validation
- [ ] Wire audit logger interface into each use case (log operation, user, timestamp)
- [ ] Write unit tests for each use case using in-memory adapters
- [ ] Test error cases: not found, validation failure, conflict

## Notes
- Use cases live in the `core` package under `use-cases/`
- Use constructor injection for port interfaces — this makes testing trivial (inject in-memory fakes)
- Consider a base use case class or pattern for common concerns (audit logging, error wrapping)
- GetProjectOverview may need to call multiple port methods and aggregate — this is where business logic lives
- Status transitions could have rules (e.g., can't go from "closed" to "in_progress" directly) — keep it simple for v1 but design for extensibility
