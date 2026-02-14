# Task 2.3: Implement GitHub Project Adapter

> **Epic:** GitHub Adapter & REST API
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 1.4, 2.2
> **Status:** Pending

## Goal
Implement the GitHub adapter for `IProjectRepository` that maps GitHub Projects and Milestones to Meridian's domain Project entity.

## Background
GitHub has two concepts that map to Meridian's Project: GitHub Projects (V2, board-based) and Milestones (simpler, issue grouping). The adapter needs to handle both, with a clear strategy for which takes precedence. The project overview is a key use case — it aggregates project data, issue counts, and status breakdowns.

## Acceptance Criteria
- [ ] `GitHubProjectRepository` implements `IProjectRepository` completely
- [ ] Get project by ID: fetches GitHub project/milestone, maps to domain Project
- [ ] List projects: returns all projects/milestones for the configured repository
- [ ] Get project overview: aggregates issue counts, status breakdown, progress metrics
- [ ] Uses mappers from task 2.2 for all data translation
- [ ] Handles both GitHub Projects V2 and Milestones (with clear strategy)
- [ ] GitHub API errors mapped to domain errors
- [ ] Octokit instance injected for testability

## Subtasks
- [ ] Decide on GitHub Projects V2 vs Milestones mapping strategy (or support both)
- [ ] Implement `GitHubProjectRepository` class with Octokit dependency injection
- [ ] Implement `getById` method for project/milestone lookup
- [ ] Implement `list` method for all projects/milestones
- [ ] Implement `getOverview` method: aggregate issues by status, priority, assignee
- [ ] Handle pagination for project/milestone listing
- [ ] Write unit tests with mocked Octokit responses
- [ ] Test overview aggregation logic with various issue distributions

## Notes
- GitHub Projects V2 uses the GraphQL API — this may require a separate Octokit GraphQL call
- Milestones are simpler and REST-accessible — consider starting with milestones for v1 and adding Projects V2 support later
- The `getOverview` method may need to fetch issues for the project and compute aggregations — this could be expensive for large projects. Consider caching strategy for v2
- This adapter is consumed by the `GetProjectOverview` use case
