---
name: doc-style-guide
description: This skill should be used when writing or reviewing documentation for the Meridian project. It covers tone conventions, formatting rules, file naming, cross-references, and project-specific terminology. Both doc-writer and doc-reviewer agents read this file.
---

# Documentation Style Guide — Meridian

Follow these conventions for all documentation in the Meridian project. The doc-writer uses this when writing, and the doc-reviewer checks against it.

## Tone and Voice

- **Second person**: address the reader as "you" — write "you can configure..." not "the user can configure..."
- **Active voice**: write "the adapter transforms..." not "the data is transformed by..."
- **Present tense**: write "this returns..." not "this will return..."
- **Imperative for instructions**: write "run `pnpm install`" not "you should run `pnpm install`"
- **Concise**: say what needs to be said, nothing more. No filler phrases ("In order to", "It should be noted that", "Basically")
- **Confident**: state facts directly. Avoid hedging ("might", "perhaps", "it seems like")

## Formatting Rules

### Headings

- **Title case** for top-level headings (`# Getting Started`)
- **Sentence case** for all other headings (`## How to configure adapters`)
- Maximum 4 heading levels (`####`). If you need more, restructure
- Blank line before and after every heading

### Lists

- Use `-` for unordered lists (not `*` or `+`)
- Use `1.` for ordered lists only when order matters (steps, sequences)
- One blank line before and after a list block
- No trailing punctuation on list items that are fragments
- Period at the end of list items that are full sentences

### Emphasis and Code

- **Bold** for UI elements, key terms on first use, and labels (`**Agent**: code-explorer`)
- *Italic* sparingly — only for emphasis within prose
- `` `backticks` `` for: inline code, file paths, command names, config keys, function names, type names
- Fenced code blocks with language identifier for multi-line code:

````markdown
```typescript
const adapter = new GitHubAdapter(config);
```
````

- Always specify language: `typescript`, `go`, `python`, `bash`, `json`, `yaml`, `markdown`
- Never use `text` or omit the language identifier on code blocks

### Tables

- Use tables for structured data with 3+ items and 2+ attributes
- Align columns with pipes for readability in source
- Bold the header row content when it aids scanning

### Links

- Relative paths for internal links: `[style guide](../skills/doc-style-guide.md)`
- Never use absolute filesystem paths in documentation
- Link to specific headings when useful: `[severity rules](../agents/code-reviewer.md#severity-rules)`

## File Naming and Location

| Doc type | Location | Naming |
|----------|----------|--------|
| Package README | `packages/<name>/README.md` | Always `README.md` |
| Component README | `<component>/README.md` | Always `README.md` |
| Architecture docs | `planning/` | Lowercase with hyphens: `mcp-architecture.md` |
| API documentation | Next to the code or `docs/` | Lowercase with hyphens: `rest-api.md` |
| Guide / How-to | `docs/` or package root | Lowercase with hyphens: `getting-started.md` |

## Section Ordering by Document Type

### README.md

1. Title and one-line description
2. Overview / What this does
3. Quick start / Installation
4. Usage / Examples
5. Configuration
6. API reference (if small; link to separate file if large)
7. Architecture (brief; link to detailed doc if needed)
8. Contributing / Development

### API Documentation

1. Overview
2. Authentication
3. Endpoints / Tools (grouped by resource)
4. Request/response formats
5. Error codes
6. Examples

### Architecture Documentation

1. Overview / Purpose
2. System diagram or component map
3. Component descriptions
4. Data flow
5. Design decisions and trade-offs
6. Extension points

## Code Examples

- Every public API should have at least one usage example
- Examples must be **runnable** — no pseudo-code unless explicitly labeled
- Show the common case first, edge cases after
- Include expected output as a comment when it aids understanding
- Keep examples minimal — show one concept per example

## Meridian-Specific Terminology

Use these terms consistently:

| Term | Meaning | Do not use |
|------|---------|------------|
| Heart | TypeScript core (`packages/*`) | "backend", "server", "TS packages" |
| CLI | Go terminal tool (`cli/`) | "command line", "terminal app" |
| Tracker | Python issue tracker (`tracker/`) | "local tracker", "Python backend" |
| adapter | Infrastructure implementation of a port | "connector", "plugin", "driver" |
| port | Domain interface defining a capability | "interface" (alone), "contract" |
| use case | Application service orchestrating domain logic | "service", "handler", "controller" |
| domain model | Core entities and value objects | "data model", "schema" |
| composition root | Wiring layer that assembles dependencies (`packages/heart/`) | "DI container", "bootstrap" |
| MCP server | Model Context Protocol server for LLM tool access | "AI server", "tool server" |
| REST API | Hono-based HTTP API (`packages/rest-api/`) | "web API", "HTTP server" |

When referring to architectural layers, use port/adapter vocabulary consistently. Write "the GitHub adapter implements the `IIssueRepository` port" — not "the GitHub connector implements the issue interface".
