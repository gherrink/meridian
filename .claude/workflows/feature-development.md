# Feature Development Workflow

Build new functionality from a task description through implementation, testing, and review.

## When to Use

- Adding new features or capabilities
- Implementing a task from `planning/tasks/` with Type=Feature
- Task contains keywords: "implement", "add", "create", "build"

## Phases

### Phase 1: Codebase Exploration (parallel, 2-3 code-explorers)

Launch 2-3 code-explorer agents in parallel, each with a different angle:

| Instance | Angle | Output File | Prompt Pattern |
|----------|-------|-------------|----------------|
| 1 | Similar features | `.claude/work/research-similar.md` | "Find features similar to [task] and trace their implementation end-to-end — entry points, call chains, data flow, patterns" |
| 2 | Architecture & interfaces | `.claude/work/research-architecture.md` | "Map the architecture, interfaces, abstractions, and component boundaries in [target area]" |
| 3 | Testing & dependencies | `.claude/work/research-testing.md` | "Find testing patterns, dependencies, and integration points for [target area]" |

Each agent writes to its own file and returns a short summary.

### Phase 2: Context Synthesis
- **Agent**: task-enricher (haiku)
- **Input**: task description + language guide path + all research files from Phase 1
- **Output**: `.claude/work/context.md`
- **Action**: Agent reads all research files, merges findings, and writes a single enriched context document

### Phase 3: Architecture Blueprint
- **Agent**: code-architect (inherit)
- **Input**: `.claude/work/context.md` + language guide path
- **Output**: `.claude/work/blueprint.md`
- **Action**: Agent reads context, analyzes patterns, and writes a decisive implementation blueprint with specific files, components, data flow, and build sequence

### Phase 4: Implementation
- **Agent**: developer (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/blueprint.md` + language guide path
- **Output**: implementation files in the codebase
- **Action**: Agent follows the blueprint to write code

### Phase 5: Review + Test Spec (parallel)
Run these two agents in parallel:

#### 5a: Test Specification
- **Agent**: test-spec-definer (inherit)
- **Input**: `.claude/work/context.md` + implementation file paths
- **Output**: `.claude/work/test-spec.md`
- **Action**: Agent reads task + code, writes test specification

#### 5b: Code Review
- **Agent**: code-reviewer (inherit)
- **Input**: implementation file paths + `.claude/work/blueprint.md` + language guide path
- **Output**: `.claude/work/review.md`
- **Action**: Agent reviews code against the blueprint and conventions, writes structured findings

### Phase 6: Review Iteration (conditional)
- **Condition**: `.claude/work/review.md` contains CRITICAL issues
- **Agent**: developer (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/blueprint.md` + `.claude/work/review.md` + implementation file paths
- **Output**: updated implementation files
- **Action**: Agent reads review, fixes critical issues
- **Skip if**: no critical issues found

### Phase 7: Test Writing
- **Agent**: test-writer (inherit)
- **Input**: `.claude/work/test-spec.md` + language guide path
- **Output**: test files in the codebase
- **Action**: Agent reads spec (NOT implementation code), writes and runs tests

### Phase 8: Test Verification
- **Actor**: orchestrator (via Bash)
- **Action**: Run the test suite for the affected package
- **On failure**: Write errors to `.claude/work/test-errors.md`, re-launch developer with error file path. Maximum 2 retries.
- **On success**: Proceed to summary

### Phase 9: Summary
- **Actor**: orchestrator
- **Action**: Report to user:
  - What was implemented
  - Files created/modified
  - Architecture decisions made
  - Test results
  - Review summary (critical issues resolved, suggestions noted)
