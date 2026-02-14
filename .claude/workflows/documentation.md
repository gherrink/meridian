# Documentation Workflow

Write or update documentation for existing code.

## When to Use

- Writing READMEs, API docs, or architecture guides
- Updating outdated documentation
- Task contains keywords: "document", "readme", "docs", "explain", "guide"

## Phases

### Phase 1: Codebase Exploration
- **Agent**: code-explorer (haiku)
- **Input**: documentation target description
- **Output**: `.claude/work/research.md`
- **Action**: Agent traces through the code to be documented — maps structure, public APIs, entry points, data flow, configuration, and existing documentation

### Phase 2: Documentation Writing
- **Agent**: doc-writer (inherit)
- **Input**: `.claude/work/research.md` + target description + language guide path (if applicable)
- **Output**: documentation files in the codebase
- **Action**: Agent reads research findings and codebase, writes documentation

### Phase 3: Summary
- **Actor**: orchestrator
- **Action**: Report to user:
  - What was documented
  - Files created or updated
  - Sections covered
