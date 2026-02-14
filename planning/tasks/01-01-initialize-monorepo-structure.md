# Task 1.1: Initialize Monorepo Structure

> **Epic:** Core Domain & Foundation
> **Type:** Feature
> **Priority:** High
> **Effort:** Small (< 1 day)
> **Dependencies:** None
> **Status:** Pending

## Goal
Set up the monorepo scaffold that all Heart packages will live in. This is the very first task — everything else builds on this structure.

## Background
Meridian's Heart is a TypeScript monorepo managed by pnpm workspaces and Turborepo. The monorepo contains ~7 packages: `core` (domain layer), `adapter-github`, `adapter-local`, `mcp-server`, `rest-api`, `heart` (composition root), and `shared` (utilities). The Go CLI and Python tracker are separate projects outside the TypeScript monorepo.

## Acceptance Criteria
- [ ] pnpm workspace configured with all package directories
- [ ] Turborepo configured with build, test, and lint pipelines in `turbo.json`
- [ ] Shared `tsconfig.base.json` with strict mode enabled (TypeScript 5.7+)
- [ ] Each package has its own `package.json` and `tsconfig.json` extending the base
- [ ] Package stubs created for: `core`, `adapter-github`, `adapter-local`, `mcp-server`, `rest-api`, `heart`, `shared`
- [ ] `turbo build` and `turbo test` run successfully (even if packages are empty stubs)
- [ ] Root `package.json` has workspace configuration and common dev dependencies
- [ ] Node.js 22 LTS specified as engine requirement

## Subtasks
- [ ] Initialize root `package.json` with pnpm workspace config
- [ ] Create `pnpm-workspace.yaml` listing all package directories
- [ ] Configure `turbo.json` with build pipeline (core first, then adapters, then heart)
- [ ] Create shared `tsconfig.base.json` with strict TypeScript settings
- [ ] Scaffold each package directory with `package.json`, `tsconfig.json`, and `src/` directory
- [ ] Set up inter-package dependencies (e.g., `adapter-github` depends on `core`)
- [ ] Verify `turbo build` resolves dependency graph correctly
- [ ] Add `.gitignore` for node_modules, dist, and build artifacts

## Notes
- Use pnpm 9.x for package management
- Turborepo 2.x for build orchestration
- The Go CLI (`cli/`) and Python tracker (`tracker/`) directories should exist at the repo root but are NOT part of the pnpm workspace
- Keep package stubs minimal — just enough for the build pipeline to work
