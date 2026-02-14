# Task 1.9: Set Up CI Pipeline

> **Epic:** Core Domain & Foundation
> **Type:** Feature
> **Priority:** High
> **Effort:** Small (< 1 day)
> **Dependencies:** 1.2
> **Status:** Pending

## Goal
Set up a CI pipeline that runs lint, type-check, and tests on every push. This ensures code quality from the earliest commits and catches regressions immediately.

## Background
The CI pipeline runs in GitHub Actions and covers the TypeScript monorepo initially. As the Go CLI and Python tracker are built (Epics 4 and 5), their test stages will be added. The pipeline has three stages: lint & type-check, unit tests, and integration tests (added later in Epic 2).

## Acceptance Criteria
- [ ] GitHub Actions workflow configured and running
- [ ] Lint stage: ESLint runs across all packages
- [ ] Type-check stage: `tsc --noEmit` runs across all packages
- [ ] Test stage: Vitest runs across all packages with coverage reporting
- [ ] Pipeline triggers on every push to any branch
- [ ] Pipeline triggers on PRs to `main`
- [ ] Pipeline fails fast: if lint fails, skip tests
- [ ] Pipeline completes in under 5 minutes for the initial monorepo

## Subtasks
- [ ] Create `.github/workflows/ci.yml`
- [ ] Configure Node.js 22 LTS setup with pnpm caching
- [ ] Add lint stage: `turbo lint`
- [ ] Add type-check stage: `turbo type-check`
- [ ] Add test stage: `turbo test`
- [ ] Configure stage dependencies (lint → type-check → test)
- [ ] Add branch protection rules for `main` (require CI pass)
- [ ] Test pipeline with a push to verify it works

## Notes
- Use pnpm's built-in caching with GitHub Actions for fast installs
- Turborepo's remote caching (Vercel) is optional — local caching in CI is sufficient for now
- Integration test stage (for real GitHub API tests) will be added in task 2.11
- Go and Python CI stages will be added in their respective epics
- Keep the workflow simple — one file, clear stages, fast feedback
