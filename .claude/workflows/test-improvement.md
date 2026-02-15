# Test Improvement Workflow

Improve, fix, or refactor existing tests — fix failing tests, eliminate flaky behavior, improve test quality, or restructure test infrastructure.

## When to Use

- Fixing failing or flaky tests
- Improving test quality, readability, or maintainability
- Refactoring test infrastructure (shared fixtures, helpers, setup)
- Task contains keywords: "improve tests", "fix tests", "flaky", "test quality", "test refactor"

## Differentiation from Test Coverage

- **Test Coverage**: adds new tests to untested code (fast, 5 phases)
- **Test Improvement**: improves/fixes/refactors existing tests (thorough, 8 phases)

## Phases

### Phase 1: Codebase Exploration (parallel, 1-3 code-explorers)

Launch all explorers as separate Task calls in the same response (do not use `run_in_background`).

Choose 1-3 exploration angles based on task scope. Each angle must be **completely different** — no overlapping concerns.

**Rules for angle selection:**
- **Simple fix** (single failing test, clear error): 1 explorer
- **Moderate improvement** (test quality across a module, fixture refactor): 2 explorers
- **Complex refactor** (test infrastructure overhaul, cross-package patterns): 3 explorers
- Each explorer writes to `.claude/work/explore-[angle].md` (e.g., `explore-test-patterns.md`, `explore-test-infrastructure.md`)
- When launching multiple explorers, tell each one what the OTHER angles are so they avoid overlap

**Example angles** (pick what fits the task — these are not a fixed set):
- Test patterns & assertions — how existing tests are structured, assertion styles, describe/it organization
- Test fixtures & helpers — shared setup, mocking patterns, test utilities, factory functions
- Test gaps & failures — which tests fail, skip, or have known issues; flaky test patterns
- Test infrastructure — test runner config, coverage setup, CI integration, test scripts

Each agent writes to its own file and returns a short summary.

### Phase 2: Context Synthesis
- **Agent**: task-enricher (haiku)
- **Input**: task description + language guide path + all research files from Phase 1
- **Output**: `.claude/work/context.md`
- **Action**: Agent reads all research files, merges findings into a context document focused on the existing test landscape and improvement targets

### Phase 3: Test Review
- **Agent**: code-reviewer (inherit)
- **Input**: target test file paths + `.claude/work/context.md` + language guide path
- **Output**: `.claude/work/review.md`
- **Action**: Agent reviews existing test code for quality issues:
  - Unclear test names or descriptions
  - Missing edge cases or error paths
  - Brittle assertions (implementation-coupled instead of behavior-coupled)
  - Duplicated setup or boilerplate
  - Flaky patterns (timing, ordering, shared state)
  - Missing or inconsistent cleanup

### Phase 4: Improvement Blueprint
- **Agent**: code-architect (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/review.md` + language guide path
- **Output**: `.claude/work/blueprint.md`
- **Action**: Agent reads context and review findings, designs an improvement plan:
  - Which test files to modify and how
  - New helpers or fixtures to extract
  - Assertion patterns to adopt
  - Structural changes (grouping, naming, organization)

### Phase 5: Test Spec + Source Fix (parallel)

Launch both agents as separate Task calls in the same response (do not use `run_in_background`):

#### 5a: Test Specification
- **Agent**: test-spec-definer (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/blueprint.md` + `.claude/work/review.md` + language guide path
- **Output**: `.claude/work/test-spec.md`
- **Action**: Agent reads review findings and blueprint, writes a test specification for the improved tests

#### 5b: Source Fix (conditional)
- **Condition**: Blueprint identifies source code changes needed (e.g., test failures reveal actual bugs)
- **Agent**: implementer (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/blueprint.md` + `.claude/work/review.md` + language guide path
- **Output**: modified source files in the codebase
- **Action**: Agent follows the blueprint to fix source code issues. Does NOT modify test files.
- **Skip if**: Blueprint contains no source code changes

### Phase 6: Test Writing
- **Agent**: test-writer (inherit)
- **Input**: `.claude/work/test-spec.md` + language guide path
- **Output**: modified/new test files in the codebase
- **Action**: Agent reads spec (NOT implementation code), writes and runs tests

### Phase 7: Test Verification
- **Actor**: orchestrator (via Bash)
- **Action**: Run tests via `.claude/scripts/run-tests.sh <command>`. On failure, pass `.claude/work/test-output.log` to the implementer agent — do NOT read the log yourself. Maximum 2 retries.
- **On success**: Proceed to summary

### Phase 8: Summary
- **Actor**: orchestrator
- **Source**: agent return summaries (do NOT read `.claude/work/` files)
- **Action**: Report to user:
  - What was improved or fixed
  - Files modified
  - Test patterns adopted
  - Test results (before vs after if applicable)
