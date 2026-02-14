# Feature Planning Workflow

Research and design a feature before implementation, producing a plan document.

## When to Use

- Designing a new feature before building it
- Researching approaches for a complex task
- Task contains keywords: "plan", "design", "research", "evaluate", "propose"

## Phases

### Phase 1: Codebase Exploration (parallel, 2-3 code-explorers)

Launch 2-3 code-explorer agents in parallel, each with a different angle:

| Instance | Angle | Output File | Prompt Pattern |
|----------|-------|-------------|----------------|
| 1 | Similar features & prior art | `.claude/work/research-similar.md` | "Find existing features similar to [feature] and trace how they're implemented end-to-end" |
| 2 | Architecture & extension points | `.claude/work/research-architecture.md` | "Map the architecture, extension points, and integration boundaries for [area]" |
| 3 | Constraints & dependencies | `.claude/work/research-constraints.md` | "Identify dependencies, constraints, and existing contracts that [feature] must work within" |

### Phase 2: Context Synthesis
- **Agent**: task-enricher (haiku)
- **Input**: planning request + language guide path + all research files from Phase 1
- **Output**: `.claude/work/context.md`
- **Action**: Agent reads all research files, merges findings into a context document

### Phase 3: External Research (parallel, 2-3 instances)
- **Agent**: researcher (haiku) — existing agent
- **Input**: specific research briefs based on the feature requirements + context
- **Output**: returned findings (researcher does not write to workspace)
- **Action**: Launch 2-3 researchers with different angles:
  - Domain research: how similar features are built elsewhere
  - Technology research: relevant libraries, tools, or approaches
  - Risk research: common pitfalls, failure modes, edge cases

### Phase 4: Architecture Blueprint
- **Agent**: code-architect (inherit)
- **Input**: `.claude/work/context.md` + language guide path + researcher findings (passed as brief summary in prompt)
- **Output**: `.claude/work/blueprint.md`
- **Action**: Agent reads context and external research, designs a complete architecture blueprint for the feature

### Phase 5: Summary
- **Actor**: orchestrator
- **Action**: Read the blueprint and report to user:
  - Feature overview
  - Chosen approach with rationale
  - Component design and data flow
  - Build sequence
  - Risks and mitigations
  - Suggested next step: run feature-development workflow with this blueprint
