# Task 2.1: Implement GitHub Issue Adapter

> **Epic:** GitHub Adapter & REST API
> **Type:** Feature
> **Priority:** High
> **Effort:** Large (3-5 days)
> **Dependencies:** 1.4, 2.2
> **Status:** Pending

## Goal
Implement the GitHub adapter for `IIssueRepository` using Octokit. This is the first real backend adapter — it translates domain operations into GitHub Issues API calls and maps responses back to domain entities.

## Background
The GitHub adapter is the primary backend for v1. It connects to GitHub's REST API via Octokit to perform CRUD operations on issues. The adapter implements the `IIssueRepository` port interface, using the mappers from task 2.2 to translate between GitHub's data model and Meridian's domain model. GitHub-specific data (labels, reactions, etc.) that don't have unified equivalents are stored in the `metadata` extension field.

## Acceptance Criteria
- [ ] `GitHubIssueRepository` implements `IIssueRepository` completely
- [ ] Create issue: maps domain Issue to GitHub issue creation params, returns created Issue
- [ ] Get issue by ID: fetches GitHub issue, maps to domain Issue
- [ ] Update issue: maps partial updates to GitHub API PATCH, returns updated Issue
- [ ] List issues: supports all filter types (status, priority, assignee, tags) mapped to GitHub query params
- [ ] Pagination supported via GitHub's pagination API
- [ ] Uses mappers from task 2.2 for all data translation (not inline mapping)
- [ ] Handles GitHub API errors gracefully (rate limiting, not found, auth failures) and maps to domain errors
- [ ] Octokit instance injected (not hardcoded) for testability

## Subtasks
- [ ] Create `adapter-github` package structure
- [ ] Implement `GitHubIssueRepository` class with Octokit dependency injection
- [ ] Implement `create` method: domain Issue → GitHub create issue API → domain Issue
- [ ] Implement `getById` method: GitHub issue number → domain Issue
- [ ] Implement `update` method: partial domain Issue → GitHub update API → domain Issue
- [ ] Implement `delete` method: close/delete GitHub issue (map to domain semantics)
- [ ] Implement `list` method: translate domain filters to GitHub API query params
- [ ] Implement `search` method: use GitHub search API for full-text search
- [ ] Map GitHub pagination (Link headers) to domain PaginatedResult
- [ ] Handle GitHub API error responses (404, 403, 422, rate limit 429) → domain errors
- [ ] Write unit tests with mocked Octokit responses

## Notes
- GitHub Issues map status as open/closed — Meridian has more granular statuses. The mapper (2.2) handles this translation, but the adapter needs to understand the mapping to construct correct API queries
- GitHub labels can represent tags, priorities, and other metadata — mapping strategy should be documented
- Rate limiting: respect GitHub's rate limit headers. Consider adding retry logic with exponential backoff for 429 responses
- Use Octokit's built-in pagination helpers where possible
