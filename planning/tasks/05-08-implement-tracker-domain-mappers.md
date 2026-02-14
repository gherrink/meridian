# Task 5.8: Implement Tracker Domain Mappers

> **Epic:** Meridian Tracker (Python)
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 1.3, 5.2
> **Status:** Pending

## Goal
Implement bidirectional mappers that translate between the Meridian Tracker's API responses and the Heart's domain model entities.

## Background
The Tracker has its own domain model (designed in task 5.2) that's similar but not identical to the Heart's unified model. The mapper layer handles all translation — status enums, priority levels, field naming differences, and any structural differences. Since both models are designed to be close, the mapping should be relatively straightforward compared to the GitHub mapper.

## Acceptance Criteria
- [ ] `toIssue(trackerIssue)`: Tracker issue response → Heart domain Issue
- [ ] `fromIssue(domainIssue)`: Heart domain Issue → Tracker issue create/update params
- [ ] `toProject(trackerProject)`: Tracker project → Heart domain Project
- [ ] `toComment(trackerComment)`: Tracker comment → Heart domain Comment
- [ ] Status enum mapping between Tracker and Heart models
- [ ] Priority enum mapping between Tracker and Heart models
- [ ] All mappers are pure functions — no side effects
- [ ] Comprehensive tests for all mapping directions

## Subtasks
- [ ] Define mapping strategy: Tracker status enum ↔ Heart status enum
- [ ] Define mapping strategy: Tracker priority enum ↔ Heart priority enum
- [ ] Implement `TrackerIssueMapper` with `toDomain` and `fromDomain` methods
- [ ] Implement `TrackerProjectMapper` with `toDomain` and `fromDomain` methods
- [ ] Implement `TrackerCommentMapper` with `toDomain` method
- [ ] Handle field name differences between Tracker and Heart models
- [ ] Handle missing/optional fields gracefully
- [ ] Write tests with Tracker API response fixtures
- [ ] Test round-trip: Heart domain → Tracker → Heart domain (no data loss)

## Notes
- Since both models are designed by the same team, mapping should be much simpler than the GitHub mapper
- Status mapping should be close to 1:1 if both use similar enums (open, in_progress, review, closed)
- Test round-trip consistency: create an issue via Heart → read it back → it should match the original
- The mapper lives in the `adapter-local` package alongside the adapter implementation
