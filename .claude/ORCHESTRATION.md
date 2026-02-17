# Orchestration System

Meridian uses a fully autonomous agent orchestration system for development tasks. A workflow orchestrator receives a task, selects the appropriate workflow, and delegates to specialized agents that write files and return short summaries.

## Architecture

```
User gives task (or path to planning/tasks/*.md)
        |
        v
[workflow-orchestrator]  (lean coordinator)
  |
  |-- 1. Select workflow (from .claude/workflows/)
  |-- 2. Determine language context (TS/Go/Python)
  |
  |-- 3. [code-explorer] x 2-3 in parallel  (different angles)
  |       explorer-1 -> writes .claude/work/explore-similar.md
  |       explorer-2 -> writes .claude/work/explore-architecture.md
  |       explorer-3 -> writes .claude/work/explore-testing.md
  |
  |-- 4. [task-enricher]  -> reads all exploration files, synthesizes
  |       writes .claude/work/context.md
  |
  |-- 5. [code-architect]  -> reads context, designs implementation
  |       writes .claude/work/blueprint.md
  |
  |-- 6. [implementer]    -> follows blueprint, writes code
  |       returns: "Implemented X. Files: src/foo.ts, src/bar.ts"
  |
  |-- 7. [test-spec-definer] + [code-reviewer]  (parallel)
  |       test-spec-definer -> writes .claude/work/test-spec.md
  |       code-reviewer     -> writes .claude/work/review.md
  |
  |-- 8. [test-writer]   -> reads ONLY test-spec.md, writes test files
  |
  |-- 9. Orchestrator reads review.md
  |       If critical issues: re-launch implementer with review path
  |
  |-- 10. Orchestrator runs tests via Bash
  |       If failures: re-launch implementer with error output file path
  |
  |-- 11. Report summary to user
```

## Design Principles

1. **Sub-agents write files** — they produce code, tests, reviews, docs directly
2. **Short returns only** — sub-agents return 1-2 sentence summary + list of changed files
3. **File-based handoff** — orchestrator passes file paths between agents, not content
4. **Fully autonomous** — no user interaction during execution
5. **Lean orchestrator** — minimal context usage; orchestrator coordinates, doesn't do the work

## Agents

| Agent | Model | Purpose                                                      |
|-------|-------|--------------------------------------------------------------|
| workflow-orchestrator | inherit | Selects workflow, delegates to agents, runs verification     |
| code-explorer | haiku | Traces codebase from a specific angle (runs 2-3 in parallel) |
| task-enricher | inherit | Synthesizes exploration files into task context              |
| code-architect | inherit | Designs implementation blueprint from context                |
| implementer | inherit | Follows blueprint + context, writes implementation code      |
| test-spec-definer | inherit | Reads code, writes test specification                        |
| test-writer | inherit | Reads spec only (never code), writes + runs tests            |
| code-reviewer | inherit | Reviews code, writes structured findings                     |
| doc-writer | inherit | Writes documentation from codebase + context                 |
| doc-reviewer | inherit | Reviews documentation against style guide and codebase       |
| web-researcher | haiku | Web research - used in planning workflows                    |
| software-architect | inherit | System-level architecture design                             |

## Workflows

| Workflow | When to Use |
|----------|-------------|
| Feature Development | Building new functionality |
| Bug Fix | Fixing broken behavior |
| Refactoring | Restructuring without changing behavior |
| Feature Planning | Designing and researching before building |
| Test Coverage | Adding tests to existing code |
| Test Improvement | Improving, fixing, or refactoring existing tests |
| Code Review | Reviewing existing code quality |
| Documentation | Writing or updating docs |
| CI/CD Pipeline | Creating, fixing, or improving CI/CD pipelines |

Workflow definitions live in `.claude/workflows/`.

## Communication Pattern

Agents communicate through files in `.claude/work/`:

| File | Writer | Reader |
|------|--------|--------|
| `explore-*.md` | code-explorer (2-3 parallel) | task-enricher |
| `research-*.md` | web-researcher (1-3 parallel) | code-architect |
| `context.md` | task-enricher | code-architect, implementer, test-spec-definer |
| `blueprint.md` | code-architect | implementer, code-reviewer |
| `implementation.md` | implementer | code-reviewer, test-spec-definer |
| `test-spec.md` | test-spec-definer | test-writer |
| `test-results.md` | test-writer | orchestrator |
| `review.md` | code-reviewer, doc-reviewer | orchestrator (decides iteration) |
| `docs.md` | doc-writer | orchestrator, doc-reviewer |

The context-building flow is: parallel explorers -> synthesizer -> architect -> implementer.

Files are overwritten per task execution. The directory is gitignored.

After each orchestration run, a `Stop` hook automatically archives work files to `.claude/work-history/[timestamp]-[task-name]/` for debugging. The task name is extracted from the first heading of `context.md` or `blueprint.md`. The history directory is also gitignored.

Hook configuration: `.claude/settings.json`
Archive script: `.claude/hooks/archive-work.sh`

## Language Guides

Language-specific conventions are injected into agents via skill file paths:

| Language | Guide | Target |
|----------|-------|--------|
| TypeScript | `.claude/skills/typescript-guide/SKILL.md` | `packages/*` (Heart) |
| Go | `.claude/skills/go-guide/SKILL.md` | `cli/*` (CLI) |
| Python | `.claude/skills/python-guide/SKILL.md` | `tracker/*` (Tracker) |

The orchestrator passes the guide path in the Task prompt. The sub-agent reads the skill file itself.

## Extending the System

### Adding a new workflow

1. Create a workflow file in `.claude/workflows/[name].md`
2. Define phases with agent assignments, inputs, outputs, and conditions
3. Add the workflow to the selection table in `.claude/agents/workflow-orchestrator.md`

### Adding a new agent

1. Create an agent file in `.claude/agents/[name].md` with frontmatter (name, model, color, tools, description)
2. Define the agent's process, input/output format, and return format
3. Reference the agent in relevant workflow definitions
