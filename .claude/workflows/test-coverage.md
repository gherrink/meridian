# Test Coverage Workflow

Add tests to existing code that lacks adequate test coverage.

## When to Use

- Adding tests to untested code
- Improving coverage for a specific module or package
- Task contains keywords: "test", "coverage", "spec"

## Phases

### Phase 1: Codebase Exploration
- **Agent**: code-explorer (haiku)
- **Input**: target area description
- **Output**: `.claude/work/explore.md`
- **Action**: Agent traces through the target code — finds all public functions, interfaces, call chains, and behaviors that need testing. Also identifies existing test infrastructure and patterns.

### Phase 2: Test Specification
- **Agent**: test-spec-definer (inherit)
- **Input**: `.claude/work/explore.md` + target implementation file paths
- **Output**: `.claude/work/test-spec.md`
- **Action**: Agent reads the code and writes a comprehensive test spec covering:
  - Happy path for each public function
  - Error conditions
  - Edge cases
  - Integration points

### Phase 3: Test Writing
- **Agent**: test-writer (inherit)
- **Input**: `.claude/work/test-spec.md` + language guide path
- **Output**: test files in the codebase
- **Action**: Agent reads spec, writes and runs tests

### Phase 4: Test Verification
- **Actor**: orchestrator (via Bash)
- **Action**: Run tests via `.claude/scripts/run-tests.sh <command>`. On failure, pass `.claude/work/test-output.log` to the implementer agent — do NOT read the log yourself. If failures are in new tests, re-launch test-writer. If failures are in existing tests, report to user and stop.

### Phase 5: Summary
- **Actor**: orchestrator
- **Source**: test-writer return summary + Phase 4 Bash output (do NOT read `.claude/work/` files)
- **Action**: Report to user:
  - Number of tests added
  - Files created
  - Coverage areas addressed
  - Test results
