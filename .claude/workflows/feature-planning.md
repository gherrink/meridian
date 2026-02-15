# Feature Planning Workflow

Research and design a feature before implementation, producing a plan document.

## When to Use

- Designing a new feature before building it
- Researching approaches for a complex task
- Task contains keywords: "plan", "design", "research", "evaluate", "propose"

## Phases

### Phase 1: Codebase Exploration (parallel, 1-3 code-explorers)

Choose 1-3 exploration angles based on planning scope. Each angle must be **completely different** — no overlapping concerns.

**Rules for angle selection:**
- **Small feature** (clear implementation path, few touch points): 1 explorer
- **Moderate feature** (new component, multiple integration points): 2 explorers
- **Large feature** (new subsystem, many unknowns): 3 explorers
- Each explorer writes to `.claude/work/research-[angle].md` (e.g., `research-similar.md`, `research-architecture.md`)
- When launching multiple explorers, tell each one what the OTHER angles are so they avoid overlap

**Example angles** (pick what fits the planning task — these are not a fixed set):
- Similar features & prior art — existing features that are similar, traced end-to-end
- Architecture & extension points — architecture, extension points, and integration boundaries
- Constraints & dependencies — dependencies, contracts, and constraints the feature must work within

Each agent writes to its own file and returns a short summary.

### Phase 2: Context Synthesis
- **Agent**: task-enricher (haiku)
- **Input**: planning request + language guide path + all research files from Phase 1
- **Output**: `.claude/work/context.md`
- **Action**: Agent reads all research files, merges findings into a context document

### Phase 3: External Research (parallel, 1-3 instances)
- **Agent**: researcher (haiku) — existing agent
- **Input**: specific research briefs based on the feature requirements + context
- **Output**: returned findings (researcher does not write to workspace)
- **Action**: Launch 1-3 researchers with different angles:
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
