# Task 6.8: Write Architecture Documentation

> **Epic:** Integration, Docs & Polish
> **Type:** Docs
> **Priority:** Medium
> **Effort:** Medium (1-3 days)
> **Dependencies:** 2.9
> **Status:** Pending

## Goal
Transform the planning documents into developer-facing architecture documentation that explains the system design, component interactions, and key decisions for contributors and maintainers.

## Background
The planning documents (01-05) contain detailed architecture analysis and decisions, but they're written for the planning phase. Developer-facing docs should be more concise, focused on "how the system works" and "why it was built this way" — useful for onboarding new contributors and making architectural decisions.

## Acceptance Criteria
- [ ] System architecture overview with component diagram
- [ ] Data flow documentation for key paths (MCP, REST, CLI)
- [ ] Package structure guide (what each Heart package does)
- [ ] Key design decisions with rationale (from planning docs, condensed)
- [ ] Domain model documentation (entities, relationships, extension points)
- [ ] Port/adapter pattern explanation with concrete examples
- [ ] Tech stack rationale (why TypeScript, Go, Python — condensed)

## Subtasks
- [ ] Extract and condense architecture overview from planning docs
- [ ] Create/update component diagram for developer docs
- [ ] Write data flow documentation for each key path
- [ ] Write package structure guide
- [ ] Condense design decisions (from `02-architecture.md`) into developer-friendly format
- [ ] Document domain model with entity relationship description
- [ ] Write port/adapter pattern guide with concrete code examples
- [ ] Add tech stack summary with rationale

## Notes
- This should be concise — not a copy of the planning docs. A developer should be able to read it in 15-20 minutes and understand the architecture
- Include code examples where helpful (e.g., "this is what a port interface looks like, this is how an adapter implements it")
- Consider placing in `docs/architecture.md` in the repo
- Mermaid diagrams render in GitHub Markdown — use them for visual architecture docs
