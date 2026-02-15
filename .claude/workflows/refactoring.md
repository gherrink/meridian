# Refactoring Workflow

Restructure existing code without changing behavior, with full test coverage before and after.

## When to Use

- Restructuring code for better organization or readability
- Extracting modules, splitting files, renaming for clarity
- Task contains keywords: "refactor", "restructure", "clean up", "reorganize"

## Phases

### Phase 1: Codebase Exploration (parallel, 1-3 code-explorers)

Launch all explorers as separate Task calls in the same response (do not use `run_in_background`).

Choose 1-3 exploration angles based on refactoring scope. Each angle must be **completely different** — no overlapping concerns.

**Rules for angle selection:**
- **Small refactor** (rename, extract single function): 1 explorer
- **Moderate refactor** (extract module, reorganize a package): 2 explorers
- **Large refactor** (cross-cutting restructure, new abstraction layer): 3 explorers
- Each explorer writes to `.claude/work/explore-[angle].md` (e.g., `explore-structure.md`, `explore-patterns.md`)
- When launching multiple explorers, tell each one what the OTHER angles are so they avoid overlap

**Example angles** (pick what fits the refactoring — these are not a fixed set):
- Code structure & dependencies — call chains, callers, module boundaries of the target code
- Patterns & conventions — architectural patterns and abstractions used in similar code
- Test coverage & behavior — existing tests, untested behaviors, and the public API surface

Each agent writes to its own file and returns a short summary.

### Phase 2: Context Synthesis
- **Agent**: task-enricher (haiku)
- **Input**: refactoring description + language guide path + all research files from Phase 1
- **Output**: `.claude/work/context.md`
- **Action**: Agent reads all research files, merges findings into a context document

### Phase 3: Architecture Blueprint
- **Agent**: code-architect (inherit)
- **Input**: `.claude/work/context.md` + language guide path
- **Output**: `.claude/work/blueprint.md`
- **Action**: Agent reads context and designs the refactored structure — which files to split/merge/rename, new module boundaries, preserved interfaces

### Phase 4: Test Spec for Existing Behavior
- **Agent**: test-spec-definer (inherit)
- **Input**: `.claude/work/context.md` + current implementation file paths
- **Output**: `.claude/work/test-spec.md`
- **Action**: Agent writes a test spec capturing the current behavior, ensuring refactoring doesn't break anything

### Phase 5: Test Writing (Pre-refactor)
- **Agent**: test-writer (inherit)
- **Input**: `.claude/work/test-spec.md` + language guide path
- **Output**: test files in the codebase
- **Action**: Agent writes and runs tests against the current code — all must pass before refactoring begins

### Phase 6: Pre-refactor Verification
- **Actor**: orchestrator (via Bash)
- **Action**: Run tests via `.claude/scripts/run-tests.sh <command>`. All must pass. If they fail, the existing code has issues — report to user and stop.

### Phase 7: Implementation (Refactor)
- **Agent**: implementer (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/blueprint.md` + language guide path
- **Output**: refactored source files only (no test files, fixtures, or test helpers)
- **Action**: Agent follows the blueprint to perform the refactoring. Must not change external behavior.

### Phase 8: Code Review
- **Agent**: code-reviewer (inherit)
- **Input**: modified file paths + `.claude/work/blueprint.md` + `.claude/work/context.md` + language guide path
- **Output**: `.claude/work/review.md`
- **Action**: Agent reviews the refactoring for correctness and adherence to the blueprint. Special attention to whether behavior was preserved.

### Phase 9: Review Iteration (conditional)
- **Condition**: `.claude/work/review.md` contains CRITICAL issues
- **Agent**: implementer (inherit)
- **Output**: updated source files only (no test files, fixtures, or test helpers)
- **Action**: Fix critical issues

### Phase 10: Post-refactor Verification
- **Actor**: orchestrator (via Bash)
- **Action**: Run tests via `.claude/scripts/run-tests.sh <command>`. All tests from Phase 5 must still pass. On failure, pass `.claude/work/test-errors.log` (or `.claude/work/test-output.log` if no errors file) to the implementer agent — do NOT read the log yourself. Maximum 2 retries.
- **On success**: Proceed to summary

### Phase 11: Summary
- **Actor**: orchestrator
- **Source**: agent return summaries (do NOT read `.claude/work/` files)
- **Action**: Report to user:
  - What was refactored and why
  - Files changed
  - Test results (before and after)
  - Review summary
