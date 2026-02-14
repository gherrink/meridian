# Task 6.7: Write README with Quickstart Guide

> **Epic:** Integration, Docs & Polish
> **Type:** Docs
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 2.9, 3.8
> **Status:** Pending

## Goal
Write the project README with a comprehensive quickstart guide that enables a new developer to go from zero to running system within 30 minutes.

## Background
The README is the project's front door. It needs to explain what Meridian is, why it exists, and how to get started — all quickly and clearly. The 30-minute onboarding target (success metric #5) means the quickstart must be thorough and tested.

## Acceptance Criteria
- [ ] Project overview: what Meridian is, what problems it solves
- [ ] Architecture diagram (simplified version from planning docs)
- [ ] Quickstart guide: clone → install → configure → run → verify (under 30 minutes)
- [ ] Component overview: Heart, CLI, Tracker with brief descriptions
- [ ] Prerequisites listed: Node.js, Go, Python, pnpm versions
- [ ] Configuration reference: key environment variables
- [ ] Links to detailed docs (MCP guide, CLI guide, adapter guide)
- [ ] Contributing section with development setup instructions
- [ ] License (MIT)
- [ ] Quickstart tested: follow the guide from scratch on a clean machine

## Subtasks
- [ ] Write project introduction and motivation
- [ ] Add simplified architecture diagram
- [ ] Write prerequisites section
- [ ] Write quickstart: Heart setup (install, configure, start)
- [ ] Write quickstart: Connect Claude Code via MCP
- [ ] Write quickstart: Install and use CLI
- [ ] Write quickstart: Start Tracker (optional)
- [ ] Write component overview section
- [ ] Write configuration reference
- [ ] Write contributing section (development setup, PR process)
- [ ] Add license section
- [ ] Test quickstart on a fresh environment

## Notes
- The quickstart should have a "happy path" that works with minimal configuration — ideally just GitHub token and a test repo
- Include a "Try it in 5 minutes" section for the truly impatient (just Heart + Claude Code with in-memory adapter)
- Test the quickstart by following it yourself on a clean environment — if any step is confusing, rewrite it
- This targets success metric #5: "New developer can clone, build, run tests, and connect Claude Code within 30 minutes"
