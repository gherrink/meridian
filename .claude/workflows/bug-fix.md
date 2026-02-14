# Bug Fix Workflow

Diagnose and fix a bug through context gathering, targeted fix, and verification.

## When to Use

- Fixing broken behavior or incorrect output
- Implementing a task from `planning/tasks/` with Type=Bugfix
- Task contains keywords: "fix", "bug", "broken", "error", "crash"

## Phases

### Phase 1: Codebase Exploration (parallel, 2-3 code-explorers)

Launch 2-3 code-explorer agents in parallel, each with a different angle:

| Instance | Angle | Output File | Prompt Pattern |
|----------|-------|-------------|----------------|
| 1 | Error area & data flow | `.claude/work/research-error.md` | "Trace the code path and data flow around [bug area], follow call chains from entry to where the error originates" |
| 2 | Related code & dependencies | `.claude/work/research-related.md` | "Map the dependencies, callers, and related components that touch [affected area]" |
| 3 | Existing tests & error handling | `.claude/work/research-tests.md` | "Find existing tests, error handling patterns, and edge cases around [bug area]" |

### Phase 2: Context Synthesis
- **Agent**: task-enricher (haiku)
- **Input**: bug description + language guide path + all research files from Phase 1
- **Output**: `.claude/work/context.md`
- **Action**: Agent reads all research files, merges findings into a context document focused on the bug area

### Phase 3: Architecture Blueprint
- **Agent**: code-architect (inherit)
- **Input**: `.claude/work/context.md` + language guide path
- **Output**: `.claude/work/blueprint.md`
- **Action**: Agent reads context, diagnoses the root cause, and writes a targeted fix blueprint — which files to modify, what the fix should look like, and why

### Phase 4: Implementation (Fix)
- **Agent**: developer (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/blueprint.md` + language guide path
- **Output**: modified implementation files in the codebase
- **Action**: Agent follows the blueprint to apply the fix. Fix should be minimal and targeted.

### Phase 5: Test Specification
- **Agent**: test-spec-definer (inherit)
- **Input**: `.claude/work/context.md` + modified file paths
- **Output**: `.claude/work/test-spec.md`
- **Action**: Agent writes a test spec that includes:
  - A regression test for the specific bug (must fail before the fix)
  - Tests for the fixed behavior
  - Tests for related edge cases

### Phase 6: Test Writing
- **Agent**: test-writer (inherit)
- **Input**: `.claude/work/test-spec.md` + language guide path
- **Output**: test files in the codebase
- **Action**: Agent reads spec, writes and runs tests

### Phase 7: Test Verification
- **Actor**: orchestrator (via Bash)
- **Action**: Run the test suite for the affected package
- **On failure**: Write errors to `.claude/work/test-errors.md`, re-launch developer. Maximum 2 retries.
- **On success**: Proceed to summary

### Phase 8: Summary
- **Actor**: orchestrator
- **Action**: Report to user:
  - Root cause of the bug
  - What was fixed
  - Files modified
  - Tests added
  - Test results
