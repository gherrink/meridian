# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meridian is a polyglot monorepo providing a unified interface for issue tracking systems (GitHub Issues, JIRA, local tracker) through MCP and REST protocols. Three components, three languages:

| Component | Language | Location | Purpose |
|---|---|---|---|
| **Heart** | TypeScript | `packages/*` | Core domain, adapters, MCP server, REST API |
| **CLI** | Go | `cli/` | Developer terminal tool (Cobra + Bubbletea) |
| **Tracker** | Python | `tracker/` | Standalone issue tracker (FastAPI + SQLite) |

## Build & Development Commands

Package manager: **pnpm 9.15.4** / Node **>=22.0.0** / Build orchestration: **Turborepo**

```bash
pnpm build          # Build all packages (tsc --build per package)
pnpm test           # Run all tests (vitest per package)
pnpm lint           # Lint all packages (eslint per package)
pnpm type-check     # Type-check all packages
pnpm clean          # Remove dist/ and tsbuildinfo

# Single package
pnpm --filter @meridian/core build
pnpm --filter @meridian/core test
pnpm --filter @meridian/core lint

# Run a single test file
cd packages/core && npx vitest run tests/specific.test.ts

# Run tests in watch mode for a package
cd packages/core && npx vitest
```

## Planning & Task Backlog

Architecture decisions and roadmap are in `planning/`. The full task backlog (66 tasks across 6 epics) is tracked in `planning/PROJECT_TASKS.md` with individual task files in `planning/tasks/`.

## Commit Convention

Conventional Commits enforced via commitlint. Use the `commit-guide` skill for message generation. Format: `type(scope): description` where type is `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
