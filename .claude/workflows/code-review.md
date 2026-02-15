# Code Review Workflow

Review existing code for quality, patterns, and issues without making changes.

## When to Use

- Auditing code quality for a module or package
- Checking adherence to project conventions
- Task contains keywords: "review", "audit", "inspect"

## Phases

### Phase 1: Codebase Exploration
- **Agent**: code-explorer (haiku)
- **Input**: target area description
- **Output**: `.claude/work/explore.md`
- **Action**: Agent traces through the target code — maps file structure, call chains, dependencies, patterns used, and test coverage

### Phase 2: Code Review
- **Agent**: code-reviewer (inherit)
- **Input**: target file paths + `.claude/work/explore.md` + language guide path
- **Output**: `.claude/work/review.md`
- **Action**: Agent performs a thorough code review, writing structured findings

### Phase 3: Summary
- **Actor**: orchestrator
- **Action**: Read `.claude/work/review.md` and report to user:
  - Overall assessment
  - Critical issues found (if any)
  - Suggestions for improvement
  - Positive observations
  - Recommended next steps (e.g., "run refactoring workflow to address issues")
