# Task 6.11: Write Adapter Development Guide

> **Epic:** Integration, Docs & Polish
> **Type:** Docs
> **Priority:** Medium
> **Effort:** Medium (1-3 days)
> **Dependencies:** 2.1, 5.7
> **Status:** Pending

## Goal
Write a guide for developing new backend adapters — explaining the port interface contract, mapper pattern, testing approach, and integration steps. Target: a developer can implement a new adapter in under one working day.

## Background
One of Meridian's key success metrics is that a new adapter can be built in under a day by a developer familiar with the codebase. This guide provides the roadmap: what interfaces to implement, how to structure mappers, how to test, and how to integrate with the composition root. It uses the GitHub and Tracker adapters as concrete references.

## Acceptance Criteria
- [ ] Port interface contract documented: every method, its semantics, error handling expectations
- [ ] Mapper pattern explained with concrete examples (GitHub mapper, Tracker mapper)
- [ ] Step-by-step guide: from new package to working adapter
- [ ] Testing guide: unit tests, compliance suite, integration tests
- [ ] Composition root integration: how to register a new adapter
- [ ] Common pitfalls and how to avoid them
- [ ] Reference implementation walkthrough (annotated GitHub adapter or Tracker adapter)

## Subtasks
- [ ] Document port interface contract (IIssueRepository, IProjectRepository, etc.)
- [ ] Document mapper pattern with code examples
- [ ] Write step-by-step guide: create package → implement interfaces → write mappers → test → integrate
- [ ] Write testing section: run compliance suite, write adapter-specific tests
- [ ] Write composition root integration guide (add adapter factory, config option)
- [ ] Document common pitfalls (error handling, pagination, status mapping)
- [ ] Create annotated walkthrough of an existing adapter as reference
- [ ] Add "Adapter Checklist" — a quick reference for what needs to be done

## Notes
- This guide validates success metric #4: "A developer can implement a new backend adapter in under one working day"
- The port interface compliance test suite (from task 1.8) is the key testing tool — mention it prominently
- Use the simpler Tracker adapter as the primary reference (less complex than GitHub)
- Include a "New Adapter Checklist" that developers can copy and check off
- Place in `docs/adapter-development.md` in the repo
