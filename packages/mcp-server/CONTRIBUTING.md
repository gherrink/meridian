# Contributing to Meridian MCP Server

This guide covers development setup, architecture, testing, and debugging for the `@meridian/mcp-server` package. For user-facing documentation (tool reference, connection setup, environment variables), see the [README](./README.md).

## Prerequisites

- Node.js >= 22.0.0
- pnpm 9.15.4
- All packages built (`pnpm build` from the repository root)

## Development setup

1. Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd gherrink-meridian
pnpm install
```

2. Build all packages (required because packages depend on each other via workspace references):

```bash
pnpm build
```

3. Create a `.env` file in `packages/heart/` for local development:

```bash
MERIDIAN_ADAPTER=memory
```

The `memory` adapter stores data in-memory with no external dependencies. Data is lost on restart, which makes it ideal for development and testing.

## Build, test, and lint commands

Run these from the repository root using pnpm filters:

| Command | Purpose |
|---------|---------|
| `pnpm --filter @meridian/mcp-server build` | Compile TypeScript to `dist/` |
| `pnpm --filter @meridian/mcp-server test` | Run Vitest test suite |
| `pnpm --filter @meridian/mcp-server lint` | Check ESLint rules |
| `pnpm --filter @meridian/mcp-server lint:fix` | Auto-fix lint issues |
| `pnpm --filter @meridian/mcp-server type-check` | Type-check without emitting |

To build and test everything across all packages:

```bash
pnpm build
pnpm test
```

Turborepo manages the task graph. The `build` task depends on `^build` (upstream packages build first), and `test` depends on `build`.

## Inspecting the server with MCP Inspector

[MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) is a browser-based developer tool for testing MCP servers interactively. It runs via npx with no installation required, launches a web UI at `http://localhost:6274`, and provides panels for listing tools, executing them with test inputs, and viewing request/response logs.

### Stdio transport

Stdio is the simplest way to inspect the server. The inspector spawns Heart as a child process and manages its lifecycle.

1. Build the project:

```bash
pnpm build
```

2. Launch the inspector:

```bash
npx @modelcontextprotocol/inspector \
  -e MERIDIAN_ADAPTER=memory \
  node packages/heart/dist/main.js
```

The `-e` flag passes environment variables to the spawned process. Add more `-e` flags as needed (for example, `-e LOG_LEVEL=debug`).

3. Open `http://localhost:6274` in your browser.

4. Click **Connect** in the top bar, then navigate to the **Tools** tab to see all registered tools.

### Streamable HTTP transport

Use this when the server is already running or you want to test the HTTP session lifecycle.

1. Start Heart with the HTTP transport:

```bash
MERIDIAN_ADAPTER=memory MCP_TRANSPORT=http MCP_HTTP_PORT=3001 \
  node packages/heart/dist/main.js
```

2. Launch the inspector without a server command:

```bash
npx @modelcontextprotocol/inspector
```

3. In the inspector UI at `http://localhost:6274`:
   - Set **Transport Type** to **Streamable HTTP**
   - Enter `http://127.0.0.1:3001/mcp` as the URL
   - Click **Connect**

### Inspector CLI mode

For scripted testing or CI, use the `--cli` flag to run tool calls from the command line:

```bash
# List all tools
npx @modelcontextprotocol/inspector --cli \
  -e MERIDIAN_ADAPTER=memory \
  node packages/heart/dist/main.js \
  --method tools/list

# Call a specific tool
npx @modelcontextprotocol/inspector --cli \
  -e MERIDIAN_ADAPTER=memory \
  node packages/heart/dist/main.js \
  --method tools/call \
  --tool-name health_check
```

### Inspector port configuration

If the default ports conflict with other services:

```bash
CLIENT_PORT=7274 SERVER_PORT=7277 \
  npx @modelcontextprotocol/inspector \
  -e MERIDIAN_ADAPTER=memory \
  node packages/heart/dist/main.js
```

## Architecture overview

The MCP server is an inbound adapter in Meridian's hexagonal architecture. It translates MCP protocol requests into calls to domain use cases and repositories defined in `@meridian/core`.

```
@modelcontextprotocol/sdk
         |
    MCP Server (this package)
         |
    Use cases + Repositories (ports from @meridian/core)
         |
    Adapters (GitHub, Local, Memory -- wired by @meridian/heart)
```

### Key components

**`createMcpServer(dependencies, config)`** -- Factory function in `src/server.ts`. Creates an `McpServer` instance, registers all tools, and applies tag filters. This is the single entry point for the package.

**`McpServerDependencies`** -- Interface in `src/types.ts` defining the use cases and repositories the server needs. Heart's composition root builds these from adapters and injects them.

**`McpServerConfig`** -- Optional configuration for server name, version, and tag-based filtering (`includeTags`, `excludeTags`).

**`registerTool()`** -- Helper in `src/helpers/register-tool.ts` that wraps the MCP SDK's `server.registerTool()` with error handling. It catches `DomainError` and unknown errors, formatting them as MCP `CallToolResult` responses so errors never crash the server.

**`ToolTagRegistry`** -- In-memory map from tool names to tag sets. Populated during tool registration, read during filter application.

**`resolveVisibleTools()`** -- Pure function in `src/helpers/resolve-visible-tools.ts` that computes which tools are visible given include/exclude tag sets. The algorithm: exclude first (remove tools where all tags match), then include (keep tools with at least one matching tag plus `shared`-tagged tools unless shared was excluded).

### Tool organization

Tools are grouped by role in `src/tools/`:

```
src/tools/
  health.ts              # health_check (tag: shared)
  shared/                # Tag: shared (search_issues, get_issue, list_milestones)
    constants.ts         # SHARED_TAGS = Set(['shared'])
    index.ts             # registerSharedTools()
    get-issue.ts
    search-issues.ts
    list-milestones.ts
  dev/                   # Tag: dev (pick_next_task, update_status, etc.)
    constants.ts         # DEV_TAGS = Set(['dev'])
    index.ts             # registerDevTools()
    ...
  pm/                    # Tag: pm (create_epic, assign_priority, etc.)
    constants.ts         # PM_TAGS = Set(['pm'])
    index.ts             # registerPmTools()
    ...
```

Each group has a barrel `index.ts` that exports a `register*Tools()` function. The server factory calls these in sequence, collecting all `RegisteredTool` handles into a map for filter application.

### How tool registration works

A tool registration follows this pattern:

```typescript
import { registerTool } from '../../helpers/index.js'
import { SHARED_TAGS } from './constants.js'

export function registerGetIssueTool(
  server: McpServer,
  registry: ToolTagRegistry,
  dependencies: McpServerDependencies,
): RegisteredTool {
  return registerTool(server, registry, 'get_issue', {
    title: 'Get issue by ID',
    description: 'Retrieves a single issue by its UUID...',
    inputSchema: GET_ISSUE_INPUT_SCHEMA.shape,
    tags: SHARED_TAGS,
  }, async (args) => {
    const issue = await dependencies.issueRepository.getById(args.issueId)
    return formatSuccessResponse(issue)
  })
}
```

Key points:

- The `inputSchema` is a Zod shape (the `.shape` property of a `z.object()`)
- Tags determine which role profiles see the tool
- The handler receives typed `args` and returns a `CallToolResult`
- Errors thrown in the handler are caught by `registerTool()`'s wrapper

### How filtering works at startup

1. `createMcpServer()` registers all tools unconditionally.
2. If `includeTags` or `excludeTags` are set in config, `applyTagFilters()` runs.
3. `resolveVisibleTools()` computes the visible set.
4. Tools not in the visible set are disabled via `registeredTool.disable()`. They remain in the registry but are not advertised to clients.

### Transport wiring

This package does not manage transports directly. The composition root in `@meridian/heart` handles transport setup:

- **Stdio**: `start-mcp-stdio.ts` creates an `StdioServerTransport`, calls `createMcpServer()`, and connects them
- **HTTP**: `start-mcp-http.ts` creates an HTTP server on `/mcp`, spawns a new `McpServer` + `StreamableHTTPServerTransport` per session (identified by UUID)

## Testing

### Test framework and configuration

Tests use Vitest with globals enabled. Configuration is in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true, // describe, it, expect available without imports
    environment: 'node',
    coverage: { provider: 'v8' },
  },
})
```

Despite globals being enabled, existing tests explicitly import from `vitest` for clarity. Follow the same convention in new tests.

### Test structure

Tests live in `tests/` and follow the Arrange-Act-Assert pattern. The test suite covers two levels:

**Unit tests** -- test individual helpers in isolation using `McpServer` instances and `vi.fn()` mocks. See `register-tool.test.ts`, `resolve-visible-tools.test.ts`, `format-response.test.ts`.

**Integration tests** -- wire real in-memory repositories and use cases through the MCP SDK's `Client` + `InMemoryTransport` to test the full request-response cycle. See `mcp-integration.test.ts`.

### Writing a unit test

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it, vi } from 'vitest'

import { registerTool } from '../src/helpers/register-tool.js'
import { ToolTagRegistry } from '../src/helpers/tool-tag-registry.js'

function createTestServer(): McpServer {
  return new McpServer({ name: 'test-server', version: '0.0.0' })
}

describe('my new helper', () => {
  it('does the expected thing', () => {
    // Arrange
    const server = createTestServer()
    const registry = new ToolTagRegistry()
    const handler = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'ok' }],
    })

    // Act
    registerTool(server, registry, 'test_tool', {
      title: 'T',
      description: 'D',
    }, handler)

    // Assert
    const tags = registry.getTagsForTool('test_tool')
    expect(tags.size).toBe(0)
  })
})
```

### Writing an integration test

Integration tests use real `@meridian/core` in-memory repositories and the MCP SDK's `InMemoryTransport` to simulate a client-server connection without network I/O:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

// Create server with real dependencies
const server = createMcpServer(dependencies)

// Connect via in-memory transport
const client = new Client({ name: 'test', version: '1.0.0' })
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
await server.connect(serverTransport)
await client.connect(clientTransport)

// Call tools and assert results
const result = await client.callTool({
  name: 'health_check',
  arguments: {},
})

// Clean up
await client.close()
await server.close()
```

See `mcp-integration.test.ts` for a full example with seeded data and all tool groups.

### Mocking dependencies

For unit tests that need `McpServerDependencies`, create mock objects with type casts:

```typescript
import type { McpServerDependencies } from '../src/types.js'

function createMockDependencies(): McpServerDependencies {
  return {
    createIssue: {} as McpServerDependencies['createIssue'],
    createMilestone: {} as McpServerDependencies['createMilestone'],
    listIssues: {} as McpServerDependencies['listIssues'],
    updateIssue: {} as McpServerDependencies['updateIssue'],
    updateStatus: {} as McpServerDependencies['updateStatus'],
    assignIssue: {} as McpServerDependencies['assignIssue'],
    getMilestoneOverview: {} as McpServerDependencies['getMilestoneOverview'],
    issueRepository: {} as McpServerDependencies['issueRepository'],
    commentRepository: {} as McpServerDependencies['commentRepository'],
    milestoneRepository: {} as McpServerDependencies['milestoneRepository'],
  }
}
```

This is sufficient when you only need to verify tool registration, filtering, or server metadata. For tests that actually call tools, use real in-memory repositories as shown in the integration test pattern.

### Adding a new tool

1. Create a file in the appropriate `src/tools/<role>/` directory.
2. Define a Zod schema for the input, export a `register*Tool()` function.
3. Use `registerTool()` with the role's tag constant (`SHARED_TAGS`, `DEV_TAGS`, or `PM_TAGS`).
4. Add the registration call to the role's barrel `index.ts`.
5. Write a unit test for error handling and an integration test for the full request-response cycle.
6. Update the tool count in existing tests if necessary (the integration test `tC-01` asserts 15 tools).

## Debugging tips

### Build before inspecting

The inspector runs compiled JavaScript from `dist/`. If you change source code, rebuild before launching the inspector:

```bash
pnpm --filter @meridian/mcp-server build
pnpm --filter @meridian/heart build
```

Or rebuild everything:

```bash
pnpm build
```

### Use the memory adapter for quick iteration

Set `MERIDIAN_ADAPTER=memory` to avoid configuring external services. This adapter requires no tokens, URLs, or running services.

### Check stderr for server logs

When using stdio transport, all server logs go to stderr to avoid interfering with the MCP protocol on stdout. If something seems wrong but the inspector shows no errors, check the terminal where you launched the inspector for stderr output.

### Verify the HTTP transport is reachable

```bash
curl http://127.0.0.1:3001/health
# Expected: {"status":"ok"}
```

If this fails, check that `MCP_TRANSPORT` is set to `http` or `both`, and that the port matches `MCP_HTTP_PORT`.

### Debug tag filtering

If tools are missing, check your `includeTags` and `excludeTags` configuration:

- `health_check` is tagged `shared` -- it is visible unless `shared` is explicitly excluded.
- When `includeTags` is set, `shared`-tagged tools are auto-included. Setting `includeTags: new Set(['dev'])` shows dev + shared + health_check (9 tools).
- `excludeTags` always wins over `includeTags`.

Use the inspector's **Tools** tab to see exactly which tools the server advertises.

### Enable debug logging

```bash
MERIDIAN_ADAPTER=memory LOG_LEVEL=debug node packages/heart/dist/main.js
```

### Inspect MCP message flow

The inspector's **History** panel shows the complete request/response log with timing information. Use this to trace the lifecycle of a tool call from initialization through execution to response.

## Code conventions

- **Named exports only** -- no default exports
- **ESM only** -- `"type": "module"`, use `.js` extensions in imports
- **Strict TypeScript** -- `noUncheckedIndexedAccess`, `verbatimModuleSyntax`
- **Naming**: camelCase for variables/functions, PascalCase for types/classes, UPPER_SNAKE for constants
- **Files**: kebab-case (for example, `register-tool.ts`)
- **Imports**: use `@meridian/*` workspace imports between packages
- **Architecture**: this package depends on `@meridian/core` and `@meridian/shared` only. Never import from other adapters or from `@meridian/heart`.
