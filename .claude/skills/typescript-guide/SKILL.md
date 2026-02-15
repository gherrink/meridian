---
name: typescript-guide
description: TypeScript conventions and patterns for the Heart packages (Hono, Zod, Vitest, hexagonal architecture). Used by implementer and test-writer agents when working on packages/* code. Contains references for hexagonal patterns, Zod schemas, and testing.
---

# TypeScript Guide — Heart Packages

Conventions for all TypeScript code in `packages/`. Follow these when writing or reviewing code.

## Architecture: Hexagonal

See `references/hexagonal-patterns.md` for detailed patterns.

```
packages/
  core/              # Domain layer: entities, port interfaces, use cases (zero deps)
  shared/            # Shared utilities (logger, error types)
  adapter-github/    # Outbound: GitHub Issues via Octokit (depends on core)
  adapter-local/     # Outbound: Meridian Tracker via HTTP (depends on core)
  mcp-server/        # Inbound: MCP protocol for LLMs (depends on core, shared)
  rest-api/          # Inbound: Hono REST API for CLI/apps (depends on core, shared)
  heart/             # Composition root: wires all packages, starts servers
```

- Dependency flow: adapters -> core (never core -> adapters). Core has ZERO external dependencies
- Turborepo task graph: `build` depends on `^build`, `test` depends on `build`, `lint`/`type-check` run independently

## Key Libraries

| Library | Purpose | Package |
|---------|---------|---------|
| Hono | HTTP framework | rest-api |
| Zod | Schema validation | core, rest-api |
| Vitest | Testing | all packages |
| Octokit | GitHub API client | adapter-github |
| jira.js | JIRA API client | adapter-jira |

## TypeScript Configuration

- ESM only (`"type": "module"`), strict mode with `noUncheckedIndexedAccess`, `verbatimModuleSyntax`
- Target: ES2023, Module: Node16, composite + incremental builds
- ESLint: `@antfu/eslint-config` (flat config)

## Coding Conventions

- **Exports**: Named exports only, no default exports
- **Types**: Define with Zod schemas where possible (see `references/zod-schema-patterns.md`)
- **Errors**: Custom error classes extending `DomainError` in core
- **Async**: async/await, never raw `.then()`
- **Naming**: camelCase variables/functions, PascalCase types/classes, UPPER_SNAKE constants
- **Files**: kebab-case (e.g., `issue-repository.ts`)
- **Imports**: Use `@meridian/*` workspace imports between packages

## Testing

See `references/testing-patterns.md` for detailed patterns.

- **Framework**: Vitest
- **Location**: `tests/` directory within each package
- **Naming**: `[name].test.ts`
- **Style**: Arrange-Act-Assert pattern
- **Mocks**: Vitest mocks for port interfaces in adapter tests

## Verification

```bash
pnpm --filter @meridian/<package> type-check   # Type-check single package
pnpm --filter @meridian/<package> lint          # Lint single package
pnpm --filter @meridian/<package> build         # Build single package
```
