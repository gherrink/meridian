# CI/CD Pipeline Workflow

Create, fix, or improve CI/CD pipelines — GitHub Actions workflows, deployment configs, and automation.

## When to Use

- Creating new CI/CD pipelines
- Fixing broken or failing pipelines
- Improving pipeline performance (caching, matrix builds, parallelism)
- Task contains keywords: "ci", "cd", "pipeline", "github actions", "deploy", "ci/cd"

## Notes

- **Cross-cutting language scope**: CI/CD pipelines span all three languages (TypeScript, Go, Python). No single language guide applies — the architect should reference build commands from the project setup (CLAUDE.md) and all relevant language guides.
- **Validation is limited**: Pipelines can be linted locally but not fully executed. The summary should note that the pipeline needs a push to verify end-to-end.

## Phases

### Phase 1: Codebase Exploration (parallel, 1-2 code-explorers)

Launch all explorers as separate Task calls in the same response (do not use `run_in_background`).

Choose 1-2 exploration angles based on task scope. Each angle must be **completely different** — no overlapping concerns.

**Rules for angle selection:**
- **Simple fix** (updating a single step, fixing a syntax error): 1 explorer
- **New pipeline or major change** (full CI setup, adding deployment): 2 explorers
- Each explorer writes to `.claude/work/explore-[angle].md` (e.g., `explore-build-system.md`, `explore-ci-config.md`)
- When launching multiple explorers, tell each one what the OTHER angles are so they avoid overlap

**Example angles** (pick what fits the task — these are not a fixed set):
- Build system & scripts — package.json scripts, Turborepo config, Go/Python build commands, test commands
- Existing CI config & project structure — `.github/` directory, existing workflows, Dockerfile, deployment config

Each agent writes to its own file and returns a short summary.

### Phase 2: Context Synthesis
- **Agent**: task-enricher (haiku)
- **Input**: task description + all research files from Phase 1
- **Output**: `.claude/work/context.md`
- **Action**: Agent reads all research files, merges findings into a context document focused on the build system and CI/CD requirements

### Phase 3: External Research (conditional, 1-2 researchers)

- **Condition**: Skip for simple fixes (typos, step updates). Use for new pipelines, complex optimization, or unfamiliar CI features.
- **Agent**: web-researcher (haiku)
- **Input**: specific CI/CD questions (e.g., "GitHub Actions caching for pnpm monorepo", "matrix builds for Go + Node + Python")
- **Output**: `.claude/work/research-[topic].md` (1 file per web-researcher instance)
- **Action**: Agent researches GitHub Actions best practices, caching strategies, matrix builds, or other CI/CD patterns relevant to the task
- **Skip if**: the task is a simple fix or the existing config provides sufficient patterns

### Phase 4: Architecture Blueprint
- **Agent**: code-architect (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/research-*.md` (if Phase 3 ran)
- **Output**: `.claude/work/blueprint.md`
- **Action**: Agent reads context and any research findings, designs the pipeline:
  - Workflow file structure (`.github/workflows/*.yml`)
  - Jobs, steps, and dependencies
  - Caching strategy
  - Matrix build configuration (if multi-language)
  - Trigger events (push, PR, schedule)
  - Environment variables and secrets references

### Phase 5: Implementation
- **Agent**: implementer (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/blueprint.md`
- **Output**: pipeline configuration and source files only (no test files)
- **Action**: Agent follows the blueprint to create or modify pipeline files

### Phase 6: Validation
- **Actor**: orchestrator (via Bash)
- **Action**: Validate pipeline configuration:
  - YAML syntax check (e.g., `python3 -c "import yaml; yaml.safe_load(open('path'))"` or similar)
  - Run `actionlint` if available
- **On failure**: Re-launch implementer with error output. Maximum 2 retries.
- **On success**: Proceed to summary

### Phase 7: Summary
- **Actor**: orchestrator
- **Source**: agent return summaries (do NOT read `.claude/work/` files)
- **Action**: Report to user:
  - Files created or modified
  - Pipeline structure (jobs, triggers, key steps)
  - Validation results
  - Note: pipeline needs a push to verify end-to-end execution
