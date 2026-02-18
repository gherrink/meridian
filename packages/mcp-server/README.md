# Meridian MCP Server

The MCP server exposes Meridian's issue tracking capabilities as tools for LLM clients via the [Model Context Protocol](https://modelcontextprotocol.io/). It supports stdio and streamable HTTP transports, with tag-based role filtering to control which tools are visible to each client.

## Quick Start

Get connected with Claude Code in under 5 minutes using the stdio transport.

1. Build the project:

```bash
pnpm install
pnpm build
```

2. Create a `.env` file in `packages/heart/`:

```bash
MERIDIAN_ADAPTER=memory
```

3. Add to your `.claude/mcp.json` (project-level or `~/.claude/mcp.json` for global):

```json
{
  "mcpServers": {
    "meridian": {
      "type": "stdio",
      "command": "node",
      "args": ["packages/heart/dist/main.js"],
      "cwd": "/absolute/path/to/gherrink-meridian",
      "env": {
        "MERIDIAN_ADAPTER": "memory"
      }
    }
  }
}
```

4. Restart Claude Code. The server registers 15 tools automatically.

## Connection Configuration

### Stdio transport (local)

Stdio is the default transport. Claude Code spawns Heart as a child process and communicates over stdin/stdout.

```json
{
  "mcpServers": {
    "meridian": {
      "type": "stdio",
      "command": "node",
      "args": ["packages/heart/dist/main.js"],
      "cwd": "/absolute/path/to/gherrink-meridian",
      "env": {
        "MERIDIAN_ADAPTER": "memory",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

No port configuration is needed. The server logs to stderr to avoid interfering with the MCP protocol on stdout.

### Streamable HTTP transport (remote)

HTTP transport runs the MCP server on a configurable host and port. Clients connect by POSTing to `/mcp`.

Start the server:

```bash
MERIDIAN_ADAPTER=memory MCP_TRANSPORT=http MCP_HTTP_PORT=3001 node packages/heart/dist/main.js
```

Configure Claude Code to connect:

```json
{
  "mcpServers": {
    "meridian": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:3001/mcp"
    }
  }
}
```

#### Session lifecycle

Each client's initial `POST /mcp` request triggers session creation with a UUID. The server returns this ID in the `mcp-session-id` response header. Subsequent requests include this header to route to the correct session. Sessions are cleaned up when the transport closes or the server shuts down.

#### HTTP endpoints

| Method   | Path      | Purpose                            |
|----------|-----------|------------------------------------|
| `POST`   | `/mcp`    | Send MCP messages, create sessions |
| `GET`    | `/mcp`    | Server-sent events for session     |
| `DELETE` | `/mcp`    | Close a session                    |
| `GET`    | `/health` | HTTP health check (returns `{"status": "ok"}`) |

### Dual transport

Run both transports simultaneously with `MCP_TRANSPORT=both`:

```bash
MERIDIAN_ADAPTER=memory MCP_TRANSPORT=both MCP_HTTP_PORT=3001 node packages/heart/dist/main.js
```

This starts a stdio listener and an HTTP server on the configured port. Each transport gets its own MCP server instance.

## Environment Variables

| Variable           | Type                                      | Default     | Description                                |
|--------------------|-------------------------------------------|-------------|--------------------------------------------|
| `MERIDIAN_ADAPTER` | `github`, `local`, `memory`               | *required*  | Which issue tracking backend to use        |
| `MCP_TRANSPORT`    | `stdio`, `http`, `both`                   | `stdio`     | Which MCP transport(s) to start            |
| `MCP_HTTP_PORT`    | integer                                   | `3001`      | Port for the HTTP transport                |
| `MCP_HTTP_HOST`    | string                                    | `127.0.0.1` | Bind address for the HTTP transport        |
| `HEART_PORT`       | integer                                   | `3000`      | Port for the REST API (runs alongside MCP) |
| `LOG_LEVEL`        | `debug`, `info`, `warn`, `error`, `fatal` | `info`      | Log verbosity                              |
| `AUDIT_LOG_PATH`   | file path                                 | *none*      | Path to write audit log file               |

### Adapter-specific variables

**GitHub** (`MERIDIAN_ADAPTER=github`):

| Variable               | Type   | Default    | Description                  |
|------------------------|--------|------------|------------------------------|
| `GITHUB_TOKEN`         | string | *required* | GitHub personal access token |
| `GITHUB_OWNER`         | string | *required* | Repository owner             |
| `GITHUB_REPO`          | string | *required* | Repository name              |
| `GITHUB_MILESTONE_ID`  | UUID   | *none*     | GitHub milestone ID          |

**Local Tracker** (`MERIDIAN_ADAPTER=local`):

| Variable      | Type | Default                 | Description               |
|---------------|------|-------------------------|---------------------------|
| `TRACKER_URL` | URL  | `http://localhost:8000` | Meridian Tracker base URL |

**Memory** (`MERIDIAN_ADAPTER=memory`): No additional variables. Data is stored in-memory and lost on restart. Useful for testing and development.

## Role Profiles

Tools are organized by role using tags: `shared`, `dev`, and `pm`. Tag-based filtering controls which tools are visible to a given MCP server instance. Filtering happens at server creation time and is immutable afterward.

### How tag filtering works

1. **No filters** -- all 15 tools are visible.
2. **`includeTags` set** -- only tools with at least one matching tag are visible. Tools tagged `shared` are automatically included unless explicitly excluded.
3. **`excludeTags` set** -- tools where *all* tags match the exclude set are hidden. Untagged tools are never excluded.
4. **Both set** -- exclude takes precedence. A tool removed by `excludeTags` stays hidden regardless of `includeTags`.

### Programmatic configuration

Role filtering is configured through the `McpServerConfig` interface when calling `createMcpServer()`. There are no environment variables for tag filtering; you set `includeTags` and `excludeTags` as `ReadonlySet<string>` values in code.

```typescript
import { createMcpServer } from '@meridian/mcp-server'

// PM role: shows PM tools + shared tools (10 tools)
const pmServer = createMcpServer(dependencies, {
  includeTags: new Set(['pm']),
})

// Dev role: shows Dev tools + shared tools (9 tools)
const devServer = createMcpServer(dependencies, {
  includeTags: new Set(['dev']),
})

// All tools: omit config or pass no tags (15 tools)
const fullServer = createMcpServer(dependencies)

// PM tools only, no shared tools or health_check (6 tools)
const pmOnlyServer = createMcpServer(dependencies, {
  includeTags: new Set(['pm']),
  excludeTags: new Set(['shared']),
})
```

### Tool visibility by role

| Role profile | `includeTags` | Visible tools | Count |
|--------------|---------------|---------------|-------|
| All (default) | *none*       | All tools     | 15    |
| PM           | `pm`          | PM + shared + `health_check` | 10 |
| Dev          | `dev`         | Dev + shared + `health_check` | 9 |
| PM only      | `pm` (exclude `shared`) | PM tools only | 6 |
| Dev only     | `dev` (exclude `shared`) | Dev tools only | 5 |

**PM visible tools:** `health_check`, `search_issues`, `get_issue`, `list_milestones`, `create_epic`, `create_milestone`, `view_roadmap`, `assign_priority`, `list_pm_milestones`, `milestone_overview`

**Dev visible tools:** `health_check`, `search_issues`, `get_issue`, `list_milestones`, `pick_next_task`, `update_status`, `view_issue_detail`, `list_my_issues`, `add_comment`

> **Note:** Different roles require separate server instances. You cannot change role filtering at runtime. Filtered tools are disabled (not removed), so they still exist in the server registry but are not advertised to clients.

## Tool Reference

### Shared tools (tag: `shared`)

#### `health_check`

Returns server health status, uptime, and version information.

- **Input:** none
- **Output:** `{ status, timestamp, version }`

#### `search_issues`

Searches and filters issues across all milestones. Supports free-text search across title and description, plus optional filters for status, priority, assignee, and milestone. Filters combine with AND logic.

| Field         | Type    | Required | Description                                   |
|---------------|---------|----------|-----------------------------------------------|
| `search`      | string  | no       | Free-text search across title and description |
| `status`      | enum    | no       | `open`, `in_progress`, or `closed`            |
| `priority`    | enum    | no       | `low`, `normal`, `high`, or `urgent`          |
| `assigneeId`  | UUID    | no       | Filter by assigned user                       |
| `milestoneId` | UUID    | no       | Filter by milestone                           |
| `page`        | integer | no       | Page number (default: 1)                      |
| `limit`       | integer | no       | Results per page, max 100 (default: 20)       |

#### `get_issue`

Retrieves a single issue by UUID. Returns the issue entity without comments. For full context including comments, use `view_issue_detail`.

| Field     | Type | Required | Description                   |
|-----------|------|----------|-------------------------------|
| `issueId` | UUID | yes      | UUID of the issue to retrieve |

#### `list_milestones`

Lists all available milestones with pagination. Returns milestone names, descriptions, and metadata. Use this to discover milestone IDs for filtering issues.

| Field   | Type    | Required | Description                             |
|---------|---------|----------|-----------------------------------------|
| `page`  | integer | no       | Page number (default: 1)                |
| `limit` | integer | no       | Results per page, max 100 (default: 20) |

### Dev tools (tag: `dev`)

#### `pick_next_task`

Suggests the highest-priority tasks available. Returns tasks sorted by priority (urgent first).

| Field        | Type    | Required | Description                                |
|--------------|---------|----------|--------------------------------------------|
| `status`     | enum    | no       | `open`, `in_progress`, or `closed`         |
| `priority`   | enum    | no       | `low`, `normal`, `high`, or `urgent`       |
| `assigneeId` | UUID    | no       | Filter by assignee                         |
| `limit`      | integer | no       | Number of suggestions, max 10 (default: 3) |

#### `update_status`

Changes the status of an issue. Use when starting work (`open` to `in_progress`), completing it (`in_progress` to `closed`), or reopening a closed issue.

| Field     | Type | Required | Description                        |
|-----------|------|----------|------------------------------------|
| `issueId` | UUID | yes      | UUID of the issue to update        |
| `status`  | enum | yes      | `open`, `in_progress`, or `closed` |

#### `view_issue_detail`

Retrieves full issue details including all comments (up to 50). For the issue entity without comments, use `get_issue`.

| Field     | Type | Required | Description               |
|-----------|------|----------|---------------------------|
| `issueId` | UUID | yes      | UUID of the issue to view |

#### `list_my_issues`

Lists all issues assigned to a specific user, grouped by status (`in_progress` first, then `open`, then `closed`). For broader cross-project search with text matching, use `search_issues`.

| Field        | Type    | Required | Description                           |
|--------------|---------|----------|---------------------------------------|
| `assigneeId` | UUID    | yes      | UUID of the user whose issues to list |
| `status`     | enum    | no       | `open`, `in_progress`, or `closed`    |
| `page`       | integer | no       | Page number (default: 1)              |
| `limit`      | integer | no       | Results per page, max 50 (default: 20)|

#### `add_comment`

Creates a new comment on an issue. The comment is attributed to the system user (see [Authentication note](#authentication-note)).

| Field     | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| `issueId` | UUID   | yes      | UUID of the issue to comment on |
| `body`    | string | yes      | Comment text (min 1 character)  |

### PM tools (tag: `pm`)

#### `create_epic`

Creates a high-level epic to group related issues. The epic is stored as an issue with `{ type: "epic" }` in its metadata.

| Field           | Type   | Required | Description                                      |
|-----------------|--------|----------|--------------------------------------------------|
| `milestoneId`   | UUID   | yes      | UUID of the milestone this epic belongs to       |
| `title`         | string | yes      | Epic name (1--500 characters)                    |
| `description`   | string | no       | Detailed scope and goals                         |
| `childIssueIds` | UUID[] | no       | Existing issue UUIDs to group under this epic    |

#### `create_milestone`

Creates a new milestone to organize and track issues. Use this when setting up a new milestone, initiative, or sprint that will contain issues and epics.

| Field         | Type                     | Required | Description                                |
|---------------|--------------------------|----------|--------------------------------------------|
| `name`        | string                   | yes      | Name of the milestone (1--200 characters)  |
| `description` | string                   | no       | Description of the milestone scope and purpose |
| `metadata`    | Record<string, string>   | no       | Key-value metadata (e.g., `{"team": "backend", "quarter": "Q1"}`) |

#### `view_roadmap`

Returns milestone progress: completion percentage, status distribution, and milestone tracking. Best for high-level progress tracking. For raw issue counts and full milestone data, use `milestone_overview`.

| Field         | Type | Required | Description                                |
|---------------|------|----------|--------------------------------------------|
| `milestoneId` | UUID | yes      | UUID of the milestone to view roadmap for  |

#### `assign_priority`

Sets or changes the priority of an issue. Use during backlog grooming, triage sessions, or when reprioritizing work.

| Field      | Type | Required | Description                          |
|------------|------|----------|--------------------------------------|
| `issueId`  | UUID | yes      | UUID of the issue to update          |
| `priority` | enum | yes      | `low`, `normal`, `high`, or `urgent` |

#### `list_pm_milestones`

Lists all milestones for planning purposes. Returns milestone names, descriptions, and metadata. For a quick milestone listing, prefer `list_milestones`.

| Field   | Type    | Required | Description                            |
|---------|---------|----------|----------------------------------------|
| `page`  | integer | no       | Page number (default: 1)               |
| `limit` | integer | no       | Results per page, max 50 (default: 20) |

#### `milestone_overview`

Returns a comprehensive milestone status snapshot: full milestone entity with metadata, plus issue counts by status. Best for detailed status reports. For a quick completion percentage, use `view_roadmap`.

| Field         | Type | Required | Description                                   |
|---------------|------|----------|-----------------------------------------------|
| `milestoneId` | UUID | yes      | UUID of the milestone to get an overview for  |

## Transport Comparison

| Feature                | Stdio                        | Streamable HTTP                     |
|------------------------|------------------------------|-------------------------------------|
| **Configuration**      | Zero config                  | Port + host settings                |
| **Network access**     | Local only (child process)   | Local or remote                     |
| **Multiple clients**   | One client per process       | Multiple clients via sessions       |
| **Session management** | Implicit (process lifecycle) | UUID-based, `mcp-session-id` header |
| **Request size limit** | System pipe buffer           | 1 MB                                |
| **Best for**           | Claude Code, local dev       | Shared servers, CI, remote access   |

## Authentication Note

The MCP server does not implement authentication. All PM and Dev tools that perform write operations use a placeholder system user ID (`00000000-0000-0000-0000-000000000000`). This means all changes are attributed to "system" rather than individual users. Authentication support is planned for a future release.

## Troubleshooting

### Connection refused on HTTP transport

Verify the server is running and the port matches your configuration:

```bash
curl http://127.0.0.1:3001/health
```

Expected response: `{"status":"ok"}`

If connecting from a remote machine, set `MCP_HTTP_HOST=0.0.0.0` to bind to all interfaces. The default (`127.0.0.1`) only accepts local connections.

### Tools not showing up

Check your tag filter configuration. Use `health_check` as a diagnostic -- it is always visible unless `shared` is explicitly excluded. When `includeTags` is set without including `shared`, shared tools still appear automatically. When `excludeTags` includes `shared`, shared tools and `health_check` are hidden.

### Invalid UUID errors

All ID fields (`issueId`, `milestoneId`, `assigneeId`) require valid UUID format. Example: `b0000000-0000-0000-0000-000000000001`.

### Server exits immediately

Check that `MERIDIAN_ADAPTER` is set. This is the only required environment variable. Configuration errors print specific field-level messages to stderr:

```
Failed to start: configuration invalid
  - MERIDIAN_ADAPTER: Required
```

### Logs polluting MCP protocol

When using stdio transport, all logs are written to stderr (not stdout). If you see garbled output, verify that your client reads stdout for MCP messages and stderr for logs separately.
