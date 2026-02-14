# Task 2.2: Implement GitHub Domain Mappers

> **Epic:** GitHub Adapter & REST API
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 1.3
> **Status:** Pending

## Goal
Implement the bidirectional mapper layer that translates between GitHub API data structures and Meridian's domain model entities. This is a separate, testable layer that keeps mapping logic out of the adapter.

## Background
GitHub's data model diverges from Meridian's unified model in several ways: GitHub has open/closed status (Meridian has more granular statuses), GitHub uses labels for categorization (Meridian has typed tags and priorities), GitHub milestones roughly map to projects/epics. The mapper layer handles all these translations, including placing GitHub-specific data in the `metadata` extension field.

## Acceptance Criteria
- [ ] `toIssue(githubIssue)`: GitHub issue response → domain Issue
- [ ] `fromIssue(domainIssue)`: domain Issue → GitHub issue creation/update params
- [ ] `toProject(githubMilestone/project)`: GitHub milestone/project → domain Project
- [ ] `toComment(githubComment)`: GitHub comment → domain Comment
- [ ] `toUser(githubUser)`: GitHub user → domain User
- [ ] Status mapping: GitHub open/closed ↔ Meridian status enum (with label-based enrichment)
- [ ] Priority mapping: GitHub labels → Meridian priority enum
- [ ] Tag mapping: GitHub labels → Meridian tags (excluding priority/status labels)
- [ ] GitHub-specific data preserved in `metadata` field (reactions, locked, milestone, etc.)
- [ ] All mappers are pure functions — no side effects, no API calls
- [ ] Comprehensive tests for all mapping directions

## Subtasks
- [ ] Define mapping strategy for GitHub status → domain status (document conventions for label-based status enrichment)
- [ ] Define mapping strategy for GitHub labels → domain priority (e.g., `priority:high` label → High priority)
- [ ] Define mapping strategy for GitHub labels → domain tags (all non-special labels)
- [ ] Implement `GitHubIssueMapper` with `toDomain` and `fromDomain` methods
- [ ] Implement `GitHubProjectMapper` for milestone/project translation
- [ ] Implement `GitHubCommentMapper` for comment translation
- [ ] Implement `GitHubUserMapper` for user translation
- [ ] Handle edge cases: missing fields, null values, unexpected data shapes
- [ ] Write tests for each mapper with real GitHub API response fixtures
- [ ] Document the label convention for status and priority mapping

## Notes
- Mapper functions should be pure and stateless — easy to test with fixture data
- Consider using GitHub API response fixtures (saved JSON) for tests instead of mocking Octokit
- The label-based status/priority convention should be documented so users know which labels to use (e.g., `status:in-progress`, `priority:high`)
- The `metadata` field should preserve enough GitHub-specific data that a round-trip (create via Meridian → read from GitHub → read via Meridian) doesn't lose important information
