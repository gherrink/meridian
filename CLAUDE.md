# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meridian is a polyglot monorepo providing a unified interface for issue tracking systems (GitHub Issues, JIRA, local tracker) through MCP and REST protocols. Three components, three languages:

| Component | Language | Location | Purpose |
|---|---|---|---|
| **Heart** | TypeScript | `packages/*` | Core domain, adapters, MCP server, REST API |
| **CLI** | Go | `cli/` | Developer terminal tool (Cobra + Bubbletea) |
| **Tracker** | Python | `tracker/` | Standalone issue tracker (FastAPI + SQLite) |

## Build & Development

Package manager: **pnpm 9.15.4** / Node **>=22.0.0** / Build orchestration: **Turborepo**. See language-specific skills (`typescript-guide`, `python-guide`, `go-guide`) for concrete build, test, and lint commands per component.

## Test Execution Rule

**Always run tests through the wrapper script** to prevent raw output from flooding the context window:

```bash
.claude/scripts/run-tests.sh <any test command>
```

The script captures full output to `.claude/work/test-output.log` and prints only a pass/fail summary.

## Planning & Task Backlog

Architecture decisions and roadmap are in `planning/`. The full task backlog (66 tasks across 6 epics) is tracked in `planning/PROJECT_TASKS.md` with individual task files in `planning/tasks/`.

## Commit Convention

Conventional Commits enforced via commitlint. Use the `commit-guide` skill for message generation. Format: `type(scope): description` where type is `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
