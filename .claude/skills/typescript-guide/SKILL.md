---
name: typescript-guide
description: TypeScript conventions and patterns for the Heart packages (Hono, Zod, Vitest, hexagonal architecture). Used by developer and test-writer agents when working on packages/* code. Contains references for hexagonal patterns, Zod schemas, and testing.
---

# TypeScript Guide — Heart Packages

This guide defines the conventions for all TypeScript code in the Meridian Heart monorepo (`packages/`). Agents must follow these patterns when writing or reviewing TypeScript code.

## Project Setup

- **Runtime**: Node.js (LTS)
- **Package manager**: pnpm with workspaces
- **Build**: Turborepo for monorepo orchestration
- **Language**: TypeScript with strict mode
- **Linting**: ESLint + Prettier

## Package Structure

Heart is organized as a monorepo with hexagonal architecture:

```
packages/
  core/              # Domain model, ports, use cases — zero external dependencies
  adapter-github/    # GitHub adapter implementing core ports
  adapter-jira/      # JIRA adapter implementing core ports
  adapter-local/     # Local Tracker adapter implementing core ports
  mcp-server/        # MCP server exposing tools
  rest-api/          # Hono REST API
  heart/             # Composition root — wires everything together
  shared/            # Shared utilities, logger, common types
```

## Architecture: Hexagonal

Heart uses hexagonal (ports & adapters) architecture. See `references/hexagonal-patterns.md` for detailed patterns.

**Key rules:**
- `core/` defines ports (interfaces) and use cases — it has ZERO external dependencies
- Adapters implement core ports and live in `adapter-*/` packages
- Dependency flow: adapters -> core (never core -> adapters)
- The composition root (`heart/`) wires ports to adapters at startup

## Key Libraries

| Library | Purpose | Package |
|---------|---------|---------|
| Hono | HTTP framework | rest-api |
| Zod | Schema validation | core, rest-api |
| Vitest | Testing | all packages |
| Octokit | GitHub API client | adapter-github |
| jira.js | JIRA API client | adapter-jira |

## Coding Conventions

- **Exports**: Use named exports, not default exports
- **Types**: Define types with Zod schemas where possible (see `references/zod-schema-patterns.md`)
- **Errors**: Use custom error classes extending a base `DomainError` in core
- **Async**: Use async/await, never raw promises with `.then()`
- **Naming**: camelCase for variables/functions, PascalCase for types/classes, UPPER_SNAKE for constants
- **Files**: kebab-case file names (e.g., `issue-repository.ts`)
- **Imports**: Use workspace imports (`@meridian/core`) between packages

## Testing

See `references/testing-patterns.md` for detailed patterns.

- **Framework**: Vitest
- **Location**: `tests/` directory within each package
- **Naming**: `[name].test.ts`
- **Style**: Arrange-Act-Assert pattern
- **Mocks**: Use Vitest mocks for port interfaces in adapter tests
