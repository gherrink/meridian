# Task 1.5: Implement In-Memory Adapters

> **Epic:** Core Domain & Foundation
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 1.4
> **Status:** Pending

## Goal
Implement in-memory fake adapters for all port interfaces. These are the test backbone for the entire project — all use cases and integration points are tested against these fakes before hitting real APIs.

## Background
In-memory adapters store data in simple JavaScript data structures (Maps, arrays) and implement the exact same port interfaces as real adapters. They provide fast, deterministic, zero-dependency testing. Every use case test, every API endpoint test, and every MCP tool test will use these fakes by default. Real API tests are reserved for integration testing only.

## Acceptance Criteria
- [ ] `InMemoryIssueRepository` implements `IIssueRepository` completely
- [ ] `InMemoryProjectRepository` implements `IProjectRepository` completely
- [ ] `InMemoryCommentRepository` implements `ICommentRepository` completely
- [ ] `InMemoryUserRepository` implements `IUserRepository` completely
- [ ] All adapters support the full filter, pagination, and sort contracts
- [ ] Data is stored in-memory with no external dependencies
- [ ] Adapters can be seeded with initial data for test setup
- [ ] Adapters are deterministic — same operations produce same results
- [ ] Unit tests verify each adapter correctly implements its port interface

## Subtasks
- [ ] Implement `InMemoryIssueRepository` with Map-based storage
- [ ] Implement `InMemoryProjectRepository` with Map-based storage
- [ ] Implement `InMemoryCommentRepository` with Map-based storage
- [ ] Implement `InMemoryUserRepository` with Map-based storage
- [ ] Implement filtering logic (status, priority, assignee, tags) for issue listing
- [ ] Implement pagination (offset/limit) for all list operations
- [ ] Implement sort options for list operations
- [ ] Add `seed(data)` method or constructor option for test data setup
- [ ] Add `reset()` method for test teardown
- [ ] Write tests for each adapter verifying contract compliance

## Notes
- These adapters live in the `core` package (they're part of the domain's test infrastructure, not a separate package)
- Consider creating a shared "port interface compliance test suite" that can be run against any adapter implementation — this ensures all adapters (in-memory, GitHub, local tracker) behave identically
- ID generation should be simple and deterministic (e.g., auto-incrementing counter)
- These will be heavily used in Epic 2 (API tests), Epic 3 (MCP tests), and throughout the project
