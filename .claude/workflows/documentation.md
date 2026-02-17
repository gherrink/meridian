# Documentation Workflow

Write or update documentation for existing code.

## When to Use

- Writing READMEs, API docs, or architecture guides
- Updating outdated documentation
- Task contains keywords: "document", "readme", "docs", "explain", "guide"

## Phases

### Phase 1: Codebase Exploration (parallel, 1-3 code-explorers)

Launch all explorers as separate Task calls in the same response (do not use `run_in_background`).

Choose 1-3 exploration angles based on documentation scope. Each angle must be **completely different** — no overlapping concerns.

**Rules for angle selection:**
- **Focused doc** (single API, one config file): 1 explorer
- **Package/component doc** (README, multiple APIs): 2 explorers
- **Cross-cutting doc** (architecture guide, system overview): 3 explorers
- Each explorer writes to `.claude/work/explore-[angle].md` (e.g., `explore-api.md`, `explore-architecture.md`)
- When launching multiple explorers, tell each one what the OTHER angles are so they avoid overlap

**Example angles** (pick what fits the task — these are not a fixed set):
- Public API & entry points — exported functions, method signatures, constructor patterns, configuration options
- Existing documentation inventory — current docs, their structure, gaps, outdated sections
- Architecture & data flow — component boundaries, dependency graph, data transformations, error propagation

Each agent writes to its own file and returns a short summary.

### Phase 2: Context Synthesis
- **Agent**: task-enricher (haiku)
- **Input**: documentation target description + language guide path (if applicable) + all exploration files from Phase 1
- **Output**: `.claude/work/context.md`
- **Action**: Agent reads all exploration files, merges findings, and writes a single enriched context document

### Phase 3: External Research (conditional, 1-2 researchers)

- **Condition**: Use the orchestrator's research decision (see complete-task.md). Skip for purely internal documentation.
- **Agent**: web-researcher (haiku)
- **Input**: specific research briefs based on the documentation requirements + context
- **Output**: `.claude/work/research-[topic].md` (1 file per web-researcher instance)
- **Action**: Launch 1-2 researchers with different angles:
  - API/library documentation: current API docs, usage examples, integration guides
  - Installation/setup: platform-specific prerequisites, version compatibility, known issues
- **Trigger when**: documenting external integrations (GitHub API, JIRA API), installation procedures, or library usage patterns
- **Skip if**: documenting purely internal code, architecture, or project-specific workflows

### Phase 4: Documentation Writing
- **Agent**: doc-writer (inherit)
- **Input**: `.claude/work/context.md` + `.claude/skills/doc-style-guide.md` path + `.claude/work/research-*.md` (if Phase 3 ran) + language guide path (if applicable)
- **Output**: documentation files in the codebase + `.claude/work/docs.md` (manifest)
- **Action**: Agent reads style guide, context, and research files, then writes documentation

### Phase 5: Documentation Review
- **Agent**: doc-reviewer (inherit)
- **Input**: `.claude/work/docs.md` + `.claude/work/context.md` + `.claude/skills/doc-style-guide.md` path
- **Output**: `.claude/work/review.md`
- **Action**: Agent reviews documentation against style guide and codebase accuracy, writes structured findings

### Phase 6: Review Iteration (conditional)
- **Condition**: doc-reviewer summary reports critical issues
- **Agent**: doc-writer (inherit)
- **Input**: `.claude/work/context.md` + `.claude/work/review.md` + `.claude/work/docs.md` + `.claude/skills/doc-style-guide.md` path
- **Output**: updated documentation files + updated `.claude/work/docs.md`
- **Action**: Agent reads review, fixes critical issues only. Single pass — documentation fixes are lighter than code fixes.
- **Skip if**: no critical issues in review

### Phase 7: Commit
- **Actor**: orchestrator (via Bash)
- **Action**: Follow the Commit Rules in `complete-task.md` to create a conventional commit of all changes.

### Phase 8: Summary
- **Actor**: orchestrator
- **Source**: agent return summaries collected during Phases 1-7 (do NOT read `.claude/work/` files)
- **Action**: Report to user:
  - What was documented (from doc-writer return summary)
  - Sections covered (from doc-writer return summary)
  - Review outcome: critical issues resolved (from Phase 6), suggestions noted, or review passed clean
  - Commit hash (from Phase 7)
