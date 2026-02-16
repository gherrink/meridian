# Feature Development Workflow

Build new functionality from a task description through implementation, testing, and review.

## When to Use

- Adding new features or capabilities
- Implementing a task from `planning/tasks/` with Type=Feature
- Task contains keywords: "implement", "add", "create", "build"

## Phases

### Phase 1: Codebase Exploration (parallel, 1-3 code-explorers)

Launch all explorers as separate Task calls in the same response (do not use `run_in_background`).

Choose 1-3 exploration angles based on task scope. Each angle must be **completely different** — no overlapping concerns.

**Rules for angle selection:**
- **Simple/focused task** (single file, clear pattern to follow): 1 explorer
- **Moderate task** (new component, multiple interfaces): 2 explorers
- **Complex task** (cross-cutting, new subsystem): 3 explorers
- **Never use a "testing patterns" angle** — the test-spec-definer discovers those independently
- Each explorer writes to `.claude/work/explore-[angle].md` (e.g., `explore-similar.md`, `explore-architecture.md`)
- When launching multiple explorers, tell each one what the OTHER angles are so they avoid overlap

**Example angles** (pick what fits the task — these are not a fixed set):
- Similar features — constructor patterns, method signatures, factory methods
- Architecture & interfaces — ports, adapters, abstractions, component boundaries
- Dependencies & integration — imports, configuration, external service connections
- Data flow & error handling — data transformations, validation, error propagation

Each agent writes to its own file and returns a short summary.

### Phase 2: Context Synthesis
- **Agent**: task-enricher (haiku)
- **Input**: task description + language guide path + all research files from Phase 1
- **Output**: `.claude/work/context.md`
- **Action**: Agent reads all research files, merges findings, and writes a single enriched context document

### Phase 3: External Research (conditional, 1-2 researchers)

- **Condition**: Use the orchestrator's research decision (see complete-task.md). Skip for tasks that follow existing codebase patterns.
- **Agent**: web-researcher (haiku)
- **Input**: specific research briefs based on the feature requirements + context
- **Output**: `.claude/work/research-[topic].md` (1 file per web-researcher instance)
- **Action**: Launch 1-2 researchers with different angles:
  - Technology research: current API docs, library versions, integration patterns
  - Risk research: common pitfalls, breaking changes, known issues
- **Skip if**: orchestrator's research decision says skip

### Phase 4: Architecture Blueprint
- **Agent**: code-architect (inherit)
- **Input**: `.claude/work/context.md` + language guide path + `.claude/work/research-*.md` (if Phase 3 ran)
- **Output**: `.claude/work/blueprint.md`
- **Action**: Agent reads context, analyzes patterns, and writes a decisive implementation blueprint with specific files, components, data flow, and build sequence

### Phase 5: Implementation
- **Agent**: implementer (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/blueprint.md` + language guide path
- **Output**: implementation source files only (no test files, fixtures, or test helpers)
- **Action**: Agent follows the blueprint to write code

### Phase 6: Review + Test Spec (parallel)
Launch both agents as separate Task calls in the same response (do not use `run_in_background`):

#### 6a: Test Specification
- **Agent**: test-spec-definer (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/implementation.md`
- **Output**: `.claude/work/test-spec.md`
- **Action**: Agent reads task + code, writes test specification

#### 6b: Code Review
- **Agent**: code-reviewer (inherit)
- **Input**: `.claude/work/implementation.md` + `.claude/work/blueprint.md` + language guide path
- **Output**: `.claude/work/review.md`
- **Action**: Agent reviews code against the blueprint and conventions, writes structured findings

### Phase 7: Review Iteration (conditional)
- **Condition**: `.claude/work/review.md` contains CRITICAL issues
- **Agent**: implementer (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/blueprint.md` + `.claude/work/review.md` + `.claude/work/implementation.md`
- **Output**: updated implementation files only (no test files, fixtures, or test helpers)
- **Action**: Agent reads review, fixes critical issues
- **Skip if**: no critical issues found

### Phase 8: Test Writing
- **Agent**: test-writer (inherit)
- **Input**: `.claude/work/test-spec.md` + language guide path
- **Output**: test files in the codebase
- **Action**: Agent reads spec (NOT implementation code), writes and runs tests

### Phase 9: Test Verification
- **Actor**: orchestrator (via Bash)
- **Action**: Run tests via `.claude/scripts/run-tests.sh <command>`. On failure, pass `.claude/work/test-errors.log` (or `.claude/work/test-output.log` if no errors file) to the implementer agent — do NOT read the log yourself. Maximum 2 retries.
- **On success**: Proceed to summary

### Phase 10: Commit
- **Actor**: orchestrator (via Bash)
- **Action**: Follow the Commit Rules in `complete-task.md` to create a conventional commit of all changes.

### Phase 11: Summary
- **Actor**: orchestrator
- **Source**: agent return summaries collected during Phases 1-10 (do NOT read `.claude/work/` files)
- **Action**: Report to user:
  - What was implemented (from implementer return summary)
  - Architecture decisions made (from code-architect return summary)
  - Test results (from test verification in Phase 9)
  - Review summary (from code-reviewer return summary: critical issues resolved, suggestions noted)
  - Commit hash (from Phase 10)
