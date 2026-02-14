# Phase 3: Tech Stack Selection

## Stack Summary

### Heart Service (TypeScript)

| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| Runtime | Node.js (LTS) | 22.x | Production-proven stability, widest MCP SDK compatibility |
| Package Manager | pnpm | 9.x | Fast installs, efficient disk usage, excellent workspace support |
| Monorepo Tool | Turborepo | 2.x | Simple build orchestration, caching, minimal config overhead |
| REST Framework | Hono | 4.x | Lightweight, multi-runtime, native OpenAPI integration via zod-openapi |
| Validation | Zod | 4.x | Required by MCP SDK as peer dependency; shared across MCP + REST |
| MCP SDK | @modelcontextprotocol/sdk | latest | Official TypeScript SDK, features land here first |
| OpenAPI Generation | @hono/zod-openapi | latest | Auto-generates OpenAPI spec from Hono routes + Zod schemas |
| GitHub Client | Octokit | latest | Official GitHub API client, TypeScript-native, excellent DX |
| JIRA Client | jira.js | 4.x | TypeScript JIRA Cloud API client, actively maintained |
| HTTP Client | undici (built-in) | Node.js built-in | For Local Tracker adapter; fast, standards-compliant |
| Logging | Pino | 9.x | Fastest structured JSON logger, ideal for audit trails |
| Testing | Vitest | 3.x | Fast, TypeScript-native, compatible with Turborepo caching |
| Linting | ESLint + Prettier | latest | Standard TypeScript linting and formatting |
| TypeScript | TypeScript | 5.7+ | Strict mode, latest features |

### CLI (Go)

| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| Language | Go | 1.23+ | Native binaries, excellent CLI ecosystem |
| CLI Framework | Cobra | latest | Industry standard for Go CLIs, subcommands, flags, auto-help |
| TUI Framework | Bubbletea + Lipgloss | latest | Rich terminal UIs, composable components, beautiful styling |
| API Client | oapi-codegen (generated) | latest | Type-safe Go client auto-generated from Heart's OpenAPI spec |
| Config | Viper | latest | File + env + flags config management, pairs with Cobra |
| Testing | Go stdlib + testify | latest | Standard Go testing with assertion helpers |

### Lightweight Tracker (Python)

| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| Language | Python | 3.12+ | Latest stable, performance improvements |
| Web Framework | FastAPI | 0.115+ | Async, auto-generated OpenAPI docs, Pydantic integration |
| Validation | Pydantic | 2.x | Data validation, comes with FastAPI |
| Database ORM | SQLModel | latest | Combines SQLAlchemy + Pydantic, made by FastAPI author |
| Storage (primary) | SQLite | built-in | Zero-config, file-based, Python has native support |
| Storage (option) | Flat files (JSON/YAML) | N/A | Alternative storage backend for simplest possible setup |
| Testing | pytest | latest | Standard Python testing |
| Dependency Mgmt | uv | latest | Fast Python package manager, replaces pip + venv |

---

## Detailed Analysis

### Runtime: Node.js vs Bun

**Selected:** Node.js 22 LTS
**Alternatives considered:** Bun 1.3+

Bun offers native TypeScript execution (no transpilation), faster startup, and 4x HTTP throughput in benchmarks. However:

- **MCP SDK compatibility:** The official `@modelcontextprotocol/sdk` is tested against Node.js. Bun compatibility is improving but edge cases remain. For a system whose core value is MCP integration, runtime compatibility risk is unacceptable.
- **Ecosystem stability:** Node.js has a decade of production track record. Bun is production-viable for many use cases in 2026, but enterprises still report edge incompatibilities with certain npm packages.
- **Recommendation:** Start with Node.js for reliability. Bun can be re-evaluated in v2 once MCP SDK officially supports it or when Bun's ecosystem matures further. Hono is runtime-agnostic, so switching is straightforward.

**Sources:**
- [Bun vs Node.js 2025 — Strapi](https://strapi.io/blog/bun-vs-nodejs-performance-comparison-guide)
- [Bun vs Deno vs Node.js 2026](https://jsgurujobs.com/blog/bun-vs-deno-vs-node-js-in-2026-and-why-your-runtime-choice-actually-matters-now)

### REST Framework: Hono vs Fastify vs Express

**Selected:** Hono
**Alternatives considered:** Fastify, Express

| Criteria | Hono | Fastify | Express |
|---|---|---|---|
| Performance | Fastest (3x Express) | Fast (2.3x Express) | Baseline |
| OpenAPI integration | Native via @hono/zod-openapi | Via JSON Schema + plugins | Via swagger middleware |
| Bundle size | Tiny (~14KB) | Medium | Medium |
| Runtime compatibility | Node, Bun, Deno, Edge | Node only | Node (+ limited Bun) |
| TypeScript support | First-class | Good | Requires @types |
| Ecosystem maturity | Growing fast | Mature | Most mature |

**Why Hono wins for this project:**
1. **@hono/zod-openapi** provides the tightest integration between Zod validation schemas and OpenAPI generation. Since Zod is already required by the MCP SDK, this means one schema definition powers: MCP tool validation, REST request validation, OpenAPI spec generation, and Go client generation. Zero duplication.
2. **Lightweight and fast.** The heart is an adapter gateway, not a heavy framework application. Hono's minimal overhead matches.
3. **Future-proof.** If we move to Bun or deploy edge functions later, Hono works everywhere.

**Sources:**
- [Hono Zod OpenAPI Example](https://hono.dev/examples/zod-openapi)
- [Hono vs Fastify — Better Stack](https://betterstack.com/community/guides/scaling-nodejs/hono-vs-fastify/)
- [Best TypeScript Backend Frameworks 2026 — Encore](https://encore.dev/articles/best-typescript-backend-frameworks)

### Validation: Zod (Not a Choice — A Constraint)

**Selected:** Zod v4
**Alternatives considered:** TypeBox, ArkType, Valibot

The MCP TypeScript SDK requires Zod as a peer dependency for tool schema definition. This makes Zod a hard constraint for the MCP server. Rather than using a different validation library for the REST API (which would mean maintaining two schema systems), we use Zod everywhere:

- **MCP tool schemas:** Zod (required by SDK)
- **REST request/response schemas:** Zod (via @hono/zod-openapi)
- **Domain model validation:** Zod (consistent, one library)
- **OpenAPI generation:** Zod → auto-generated spec

ArkType is 100x faster and TypeBox is more JSON Schema-native, but neither can replace Zod in the MCP SDK. Using Zod everywhere eliminates the duplication of maintaining two schema systems.

**Sources:**
- [MCP TypeScript SDK — Zod Peer Dependency](https://github.com/modelcontextprotocol/typescript-sdk)
- [Zod vs Valibot vs ArkType 2026 — Pockit](https://pockit.tools/blog/zod-valibot-arktype-comparison-2026/)

### Monorepo: Turborepo vs Nx

**Selected:** Turborepo + pnpm workspaces
**Alternatives considered:** Nx, plain pnpm workspaces

| Criteria | Turborepo | Nx |
|---|---|---|
| Config complexity | Minimal (turbo.json) | Higher (nx.json + project.json per package) |
| Build caching | Local + remote (Vercel) | Local + remote (Nx Cloud) |
| Performance | Fast | Faster (7x in large monorepos per benchmarks) |
| Learning curve | Low | Medium |
| Language support | JS/TS focus | Multi-language (Go, Python, etc.) |
| Best for | Small-medium monorepos | Large, complex monorepos |

**Why Turborepo:** The heart's TypeScript monorepo has ~7 packages. At this scale, Turborepo's simplicity wins over Nx's power. Nx's advantages (distributed task execution, fine-grained project graph) become relevant at 50+ packages, not 7. Turborepo's minimal config means less maintenance overhead.

**Note:** The Go CLI and Python tracker are separate projects (separate `go.mod` and `pyproject.toml`), not part of the TypeScript monorepo. Turborepo only manages the TypeScript packages.

**Sources:**
- [Monorepo Insights: Nx, Turborepo, pnpm — Ekino](https://medium.com/ekino-france/monorepo-insights-nx-turborepo-and-pnpm-3-4-751384b5a6db)
- [Top 5 Monorepo Tools 2025 — Aviator](https://www.aviator.co/blog/monorepo-tools/)

### Logging: Pino vs Winston

**Selected:** Pino
**Alternatives considered:** Winston

Pino is the fastest structured JSON logger for Node.js. It produces NDJSON (Newline Delimited JSON) by default — each log line is a valid JSON object with timestamp, level, context, and message. This is exactly what audit logging needs: machine-parseable, structured, easy to ship to any log aggregator.

Winston is more popular (12M weekly downloads) and more flexible with its transport system, but Pino's speed advantage (5-10x faster in benchmarks) and JSON-first design make it the better choice for a system where every operation must be logged for compliance.

**Sources:**
- [Pino vs Winston — Better Stack](https://betterstack.com/community/comparisons/pino-vs-winston/)
- [Pino Logger Complete Guide 2026 — SigNoz](https://signoz.io/guides/pino-logger/)

### Go CLI: API Client Generation

**Selected:** oapi-codegen
**Alternatives considered:** openapi-generator (Go), hand-written client

The Go CLI needs a type-safe HTTP client to talk to the Heart's REST API. Rather than hand-writing one, we generate it from the Heart's OpenAPI spec:

1. Heart builds → OpenAPI spec generated by @hono/zod-openapi
2. oapi-codegen reads spec → generates Go types + client functions
3. CLI imports generated client → type-safe API calls

**Why oapi-codegen over openapi-generator:** oapi-codegen is Go-native, produces idiomatic Go code, and is actively maintained. openapi-generator produces more generic output that often needs manual refinement.

**Sources:**
- [oapi-codegen — GitHub](https://github.com/oapi-codegen/oapi-codegen)
- [OpenAPI Generator — GitHub](https://github.com/OpenAPITools/openapi-generator)

### Python Tracker: SQLModel + FastAPI

**Selected:** FastAPI + SQLModel + SQLite
**Alternatives considered:** Flask + SQLAlchemy, Django REST

SQLModel is built on top of SQLAlchemy and Pydantic and was created by the same author as FastAPI. This means:

- One model definition serves as: database table schema (SQLAlchemy), API request/response validation (Pydantic), and OpenAPI documentation (FastAPI auto-generation)
- Tight integration means less glue code
- Pydantic v2 for performance

SQLite is the default storage, using Python's built-in `sqlite3` module. For users who want even simpler storage, a flat file backend (JSON or YAML) can be offered as an alternative storage adapter — the tracker will use its own ports/adapters pattern internally.

**Sources:**
- [SQLModel — FastAPI and Pydantic](https://sqlmodel.tiangolo.com/tutorial/fastapi/)
- [FastAPI SQL Databases Tutorial](https://fastapi.tiangolo.com/tutorial/sql-databases/)

---

## Compatibility Notes

### Schema Flow (Single Source of Truth)

```
Zod Schema (TypeScript)
  ├── MCP Tool input validation (via MCP SDK)
  ├── REST API request/response validation (via Hono)
  ├── OpenAPI 3.1 spec auto-generated (via @hono/zod-openapi)
  │     ├── Go CLI client auto-generated (via oapi-codegen)
  │     └── API documentation auto-generated (Swagger UI / Scalar)
  └── Domain model validation (shared across all use cases)
```

This means: **define a schema once in Zod, and it propagates to every consumer.** No manual sync needed.

### Cross-Language Communication

| From | To | Protocol | Contract |
|---|---|---|---|
| LLM → Heart | MCP protocol (stdio / streamable HTTP) | MCP SDK handles encoding |
| Go CLI → Heart | HTTP/REST | OpenAPI spec → generated Go client |
| Heart → Lightweight Tracker | HTTP/REST | Tracker's FastAPI auto-generates OpenAPI |
| Heart → GitHub API | HTTPS | Octokit client library |
| Heart → JIRA API | HTTPS | jira.js client library |

### Build Pipeline Integration

```
1. pnpm install          → Install all TS dependencies
2. turbo build           → Build all TS packages (core first, then adapters, then heart)
3. turbo test            → Run all TS tests
4. turbo generate:openapi → Generate OpenAPI spec from heart
5. oapi-codegen spec.json → Generate Go client from OpenAPI spec
6. cd cli && go build    → Build Go CLI
7. cd tracker && uv sync → Install Python deps
8. cd tracker && pytest  → Test tracker
```

### Version Compatibility Matrix

| Component | Depends On | Version Constraint |
|---|---|---|
| MCP SDK | Zod v4 | Peer dependency, must match |
| @hono/zod-openapi | Zod v4, Hono 4.x | Compatible versions |
| oapi-codegen | OpenAPI 3.1 spec | Generated from Hono |
| Go CLI | Heart REST API | Contract via OpenAPI spec |
| Tracker Adapter | Tracker REST API | Contract via Tracker's OpenAPI spec |
