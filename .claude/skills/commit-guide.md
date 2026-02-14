---
name: commit-guide
description: This skill should be used when the user asks to "write a commit message", "create a commit", "format a commit", "commit this", "conventional commit", "what type should this commit be", "what scope should I use", or needs guidance on commit message formatting, scopes, types, or commitlint conventions for the Meridian project.
---

# Conventional Commit Guide — Meridian

Follow this specification exactly for all commit messages. Commitlint enforces these rules at commit time.

## Format

```
type(scope): description

[optional body]

[optional footer(s)]
```

### Rules

- **Subject line**: `type(scope): description`
  - `type` is required (see types below)
  - `scope` is optional but encouraged (see scopes below)
  - `description` is required
- **Imperative mood**: Write "add feature" not "added feature" or "adds feature"
- **Lowercase**: The description must start with a lowercase letter
- **No trailing period**: Do not end the subject line with a period
- **Max length**: Subject line must be 72 characters or fewer
- **Body**: Wrap at 100 characters per line. Explain *what* and *why*, not *how*
- **Blank line**: Separate subject from body, and body from footer, with a blank line

## Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `docs` | Documentation-only changes (README, architecture docs, docstrings, comments) |
| `style` | Code style changes that do not affect logic (formatting, whitespace) |
| `refactor` | Code restructuring that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `build` | Changes to build system or dependencies (package.json, go.mod, pyproject.toml, turbo.json) |
| `ci` | Changes to CI configuration (GitHub Actions, pre-commit hooks) |
| `chore` | Maintenance tasks that don't fit other types (scaffolding, tooling config) |
| `revert` | Reverting a previous commit |

## Scopes

Scopes correspond to the Meridian monorepo layout. Use the most specific applicable scope:

### Heart packages (TypeScript monorepo)

| Scope | Applies to |
|-------|------------|
| `core` | `packages/core/` — domain model, port interfaces, use cases, domain errors |
| `adapter-github` | `packages/adapter-github/` — GitHub Issues adapter (Octokit) and mappers |
| `adapter-jira` | `packages/adapter-jira/` — JIRA Cloud adapter (jira.js) and mappers |
| `adapter-local` | `packages/adapter-local/` — Local Tracker adapter (HTTP client) and mappers |
| `mcp-server` | `packages/mcp-server/` — MCP server, role-based tools, tag filtering |
| `rest-api` | `packages/rest-api/` — Hono REST API, routes, middleware, OpenAPI generation |
| `heart` | `packages/heart/` — composition root, config manager, dependency wiring |
| `shared` | `packages/shared/` — shared utilities, logger, common types and errors |

### Standalone components

| Scope | Applies to |
|-------|------------|
| `cli` | `cli/` — Go CLI (Cobra commands, Bubbletea TUI, Lipgloss styling) |
| `tracker` | `tracker/` — Python lightweight tracker (FastAPI, SQLModel, storage backends) |

### Cross-cutting

| Scope | Applies to |
|-------|------------|
| `deps` | Dependency changes across any language (package.json, go.mod, pyproject.toml) |
| `ci` | CI/CD pipeline configuration (GitHub Actions, workflows) |
| `claude` | `.claude/` directory (commands, agents, skills, settings) |
| `planning` | `planning/` directory (architecture docs, task files, roadmap) |

Omit the scope for changes that span multiple packages or affect the project root.

## Breaking Changes

Breaking changes must be indicated in one of two ways:

1. **Footer notation**: Add `BREAKING CHANGE: description` as a footer
2. **Type suffix**: Append `!` after the type/scope, e.g., `feat(rest-api)!: redesign issue endpoint schema`

When both are present, the footer description takes precedence for changelogs.

## Examples

### Good — follow these patterns

```
feat(core): add Issue and Epic domain model entities
```

```
feat(adapter-github): implement IIssueRepository with Octokit
```

```
fix(rest-api): handle missing project ID in overview endpoint
```

```
feat(mcp-server): add create-epic tool for PM role profile
```

```
refactor(core): extract port interfaces from use case module
```

```
feat(cli): implement meridian overview command with Bubbletea TUI
```

```
feat(tracker): add SQLite storage backend with SQLModel
```

```
docs: update README with quickstart guide
```

```
test(core): add unit tests for CreateIssueUseCase
```

```
chore: configure Turborepo build pipeline and pnpm workspaces
```

```
feat(rest-api)!: change issue list response to paginated format

BREAKING CHANGE: GET /api/v1/issues now returns { items, total, page }
instead of a flat array. Update CLI client accordingly.
```

```
fix(adapter-github): correct label mapping for priority field

GitHub labels use "priority:high" format but the mapper expected
"P1" format. Normalize both formats to the domain Priority enum
for consistent behavior across adapters.
```

### Bad — avoid these anti-patterns

```
Fixed bug                          # no type, vague description
feat: Added new models             # past tense, not imperative
Feat(core): Add domain types.      # uppercase type, trailing period
feat(core): Add Issue, Epic, Sprint, Comment, User, Project, Status, Priority, and Tag domain model entities with full Zod validation
                                   # too long (over 72 chars)
update stuff                       # no type, vague
feat(core) add port interfaces     # missing colon after scope
```

## Multi-line Commit Example

```
feat(mcp-server): add tag-based role filtering for tool exposure

Filter MCP tools by role tags (pm, dev, shared) based on client
connection parameters. Clients connect with ?include_tags=pm to
receive only PM-relevant tools, keeping LLM context focused.

Closes #12
```
