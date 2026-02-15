# Bug Fix Workflow

Diagnose and fix a bug through context gathering, targeted fix, and verification.

## When to Use

- Fixing broken behavior or incorrect output
- Implementing a task from `planning/tasks/` with Type=Bugfix
- Task contains keywords: "fix", "bug", "broken", "error", "crash"

## Phases

### Phase 1: Codebase Exploration (parallel, 1-3 code-explorers)

Launch all explorers as separate Task calls in the same response (do not use `run_in_background`).

Choose 1-3 exploration angles based on bug scope. Each angle must be **completely different** — no overlapping concerns.

**Rules for angle selection:**
- **Obvious/isolated bug** (clear stack trace, single module): 1 explorer
- **Moderate bug** (unclear root cause, spans a few files): 2 explorers
- **Complex bug** (cross-cutting, unclear reproduction): 3 explorers
- Each explorer writes to `.claude/work/explore-[angle].md` (e.g., `explore-error.md`, `explore-related.md`)
- When launching multiple explorers, tell each one what the OTHER angles are so they avoid overlap

**Example angles** (pick what fits the bug — these are not a fixed set):
- Error area & data flow — trace code path from entry to where the error originates
- Related code & dependencies — map callers, dependencies, and components touching the affected area
- Existing tests & error handling — find tests, error handling patterns, and edge cases around the bug area

Each agent writes to its own file and returns a short summary.

### Phase 2: Context Synthesis
- **Agent**: task-enricher (haiku)
- **Input**: bug description + language guide path + all research files from Phase 1
- **Output**: `.claude/work/context.md`
- **Action**: Agent reads all research files, merges findings into a context document focused on the bug area

### Phase 3: External Research (conditional, 1-2 researchers)

- **Condition**: Use the orchestrator's research decision (see complete-task.md). Skip for bugs in purely internal logic.
- **Agent**: web-researcher (haiku)
- **Input**: specific research briefs based on the bug context + affected external systems
- **Output**: `.claude/work/research-[topic].md` (1 file per web-researcher instance)
- **Action**: Launch 1-2 researchers with different angles:
  - API/library research: current API behavior, known bugs, changelog entries, migration notes
  - Error research: common causes of the observed error, known workarounds, related issues
- **Skip if**: orchestrator's research decision says skip

### Phase 4: Architecture Blueprint
- **Agent**: code-architect (inherit)
- **Input**: `.claude/work/context.md` + language guide path + `.claude/work/research-*.md` (if Phase 3 ran)
- **Output**: `.claude/work/blueprint.md`
- **Action**: Agent reads context, diagnoses the root cause, and writes a targeted fix blueprint — which files to modify, what the fix should look like, and why

### Phase 5: Implementation (Fix)
- **Agent**: implementer (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/blueprint.md` + language guide path
- **Output**: fixed implementation files only (no test files, fixtures, or test helpers)
- **Action**: Agent follows the blueprint to apply the fix. Fix should be minimal and targeted.

### Phase 6: Test Specification
- **Agent**: test-spec-definer (inherit)
- **Input**: `.claude/work/context.md` + modified file paths
- **Output**: `.claude/work/test-spec.md`
- **Action**: Agent writes a test spec that includes:
  - A regression test for the specific bug (must fail before the fix)
  - Tests for the fixed behavior
  - Tests for related edge cases

### Phase 7: Test Writing
- **Agent**: test-writer (inherit)
- **Input**: `.claude/work/test-spec.md` + language guide path
- **Output**: test files in the codebase
- **Action**: Agent reads spec, writes and runs tests

### Phase 8: Test Verification
- **Actor**: orchestrator (via Bash)
- **Action**: Run tests via `.claude/scripts/run-tests.sh <command>`. On failure, pass `.claude/work/test-output.log` to the implementer agent — do NOT read the log yourself. Maximum 2 retries.
- **On success**: Proceed to summary

### Phase 9: Summary
- **Actor**: orchestrator
- **Source**: agent return summaries collected during Phases 1-8 (do NOT read `.claude/work/` files)
- **Action**: Report to user:
  - Root cause of the bug
  - What was fixed
  - Files modified
  - Tests added
  - Test results
