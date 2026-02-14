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

## Architecture

**Hexagonal (Ports & Adapters)** — the core domain defines port interfaces, adapters implement them, and the composition root wires everything at startup.

```
packages/
  core/              # Domain layer: entities, port interfaces, use cases (zero deps)
  shared/            # Shared utilities (logger, error types)
  adapter-github/    # Outbound: GitHub Issues via Octokit (depends on core)
  adapter-local/     # Outbound: Meridian Tracker via HTTP (depends on core)
  mcp-server/        # Inbound: MCP protocol for LLMs (depends on core, shared)
  rest-api/          # Inbound: Hono REST API for CLI/apps (depends on core, shared)
  heart/             # Composition root: wires all packages, starts servers
```

**Dependency rule:** adapters depend on core, never the reverse. Core has zero external dependencies.

**Turborepo task graph:** `build` depends on `^build` (builds dependencies first). `test` depends on `build`. `lint` and `type-check` run independently.

## TypeScript Configuration

- ESM only (`"type": "module"` in all packages)
- Strict mode with `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `noPropertyAccessFromIndexSignature`
- Target: ES2023, Module: Node16
- Composite + incremental builds for monorepo project references
- ESLint: `@antfu/eslint-config` (flat config)
- Testing: Vitest with v8 coverage, workspace config at root

## Naming Conventions

- Files: `kebab-case.ts`
- Functions/variables: `camelCase`
- Types/classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Named exports only (no default exports)
- Workspace imports: `@meridian/*`

## Orchestration System

Development tasks can be delegated to an autonomous agent pipeline defined in `.claude/ORCHESTRATION.md`. The workflow orchestrator selects a workflow from `.claude/workflows/`, spawns specialized agents (explorer, architect, developer, reviewer, test-writer), and coordinates via files in `.claude/work/`.

Language-specific conventions are in skill files:
- TypeScript: `.claude/skills/typescript-guide/SKILL.md`
- Go: `.claude/skills/go-guide/SKILL.md`
- Python: `.claude/skills/python-guide/SKILL.md`

## Planning & Task Backlog

Architecture decisions and roadmap are in `planning/`. The full task backlog (66 tasks across 6 epics) is tracked in `planning/PROJECT_TASKS.md` with individual task files in `planning/tasks/`.

## Commit Convention

Conventional Commits enforced via commitlint. Use the `/commit` command to auto-generate compliant messages. Format: `type(scope): description` where type is `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
