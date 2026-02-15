# Project Tasks: Meridian

> Generated: 2026-02-14
> Total tasks: 66 | Completed: 0/66
> Priorities: 39 High | 24 Medium | 3 Low

## Overview
Meridian is an enterprise-ready project management standardization tool that provides a unified interface for interacting with any issue tracking system (GitHub Issues, JIRA, local tracker) through MCP (for LLMs) and REST API (for CLI and external apps). The system uses a "Lean Heart" hexagonal architecture with a TypeScript core, a Go CLI, and a Python lightweight tracker.

---

## Epic 1: Core Domain & Foundation
Priority: **High** | Effort: **15-20 days** | Dependencies: None

| # | Task | Type | Priority | Status | File |
|---|------|------|----------|--------|------|
| 1.1 | Initialize monorepo structure | Feature | High | Done   | [tasks/01-01-initialize-monorepo-structure.md](./tasks/01-01-initialize-monorepo-structure.md) |
| 1.2 | Set up shared dev tooling | Feature | High | Done   | [tasks/01-02-setup-shared-dev-tooling.md](./tasks/01-02-setup-shared-dev-tooling.md) |
| 1.3 | Design domain model entities | Feature | High | Done   | [tasks/01-03-design-domain-model-entities.md](./tasks/01-03-design-domain-model-entities.md) |
| 1.4 | Define port interfaces | Feature | High | Done   | [tasks/01-04-define-port-interfaces.md](./tasks/01-04-define-port-interfaces.md) |
| 1.5 | Implement in-memory adapters | Feature | High | Done   | [tasks/01-05-implement-in-memory-adapters.md](./tasks/01-05-implement-in-memory-adapters.md) |
| 1.6 | Implement domain use cases | Feature | High | Done   | [tasks/01-06-implement-domain-use-cases.md](./tasks/01-06-implement-domain-use-cases.md) |
| 1.7 | Set up Pino-based audit logger | Feature | Medium | Done   | [tasks/01-07-setup-pino-audit-logger.md](./tasks/01-07-setup-pino-audit-logger.md) |
| 1.8 | Write comprehensive domain tests | Feature | High | Done   | [tasks/01-08-write-comprehensive-domain-tests.md](./tasks/01-08-write-comprehensive-domain-tests.md) |
| 1.9 | Set up CI pipeline | Feature | High | Done   | [tasks/01-09-setup-ci-pipeline.md](./tasks/01-09-setup-ci-pipeline.md) |

---

## Epic 2: GitHub Adapter & REST API
Priority: **High** | Effort: **18-25 days** | Dependencies: Epic 1

| # | Task | Type | Priority | Status  | File |
|---|------|------|----------|---------|------|
| 2.1 | Implement GitHub issue adapter | Feature | High | Done    | [tasks/02-01-implement-github-issue-adapter.md](./tasks/02-01-implement-github-issue-adapter.md) |
| 2.2 | Implement GitHub domain mappers | Feature | High | Done    | [tasks/02-02-implement-github-domain-mappers.md](./tasks/02-02-implement-github-domain-mappers.md) |
| 2.3 | Implement GitHub project adapter | Feature | High | Done    | [tasks/02-03-implement-github-project-adapter.md](./tasks/02-03-implement-github-project-adapter.md) |
| 2.4 | Set up Hono REST API | Feature | High | Pending | [tasks/02-04-setup-hono-rest-api.md](./tasks/02-04-setup-hono-rest-api.md) |
| 2.5 | Define REST API routes | Feature | High | Pending | [tasks/02-05-define-rest-api-routes.md](./tasks/02-05-define-rest-api-routes.md) |
| 2.6 | Auto-generate OpenAPI spec | Feature | Medium | Pending | [tasks/02-06-auto-generate-openapi-spec.md](./tasks/02-06-auto-generate-openapi-spec.md) |
| 2.7 | Implement config manager | Feature | High | Pending | [tasks/02-07-implement-config-manager.md](./tasks/02-07-implement-config-manager.md) |
| 2.8 | Set up GitHub auth delegation | Feature | Medium | Pending | [tasks/02-08-setup-github-auth-delegation.md](./tasks/02-08-setup-github-auth-delegation.md) |
| 2.9 | Implement composition root | Feature | High | Pending | [tasks/02-09-implement-composition-root.md](./tasks/02-09-implement-composition-root.md) |
| 2.10 | Write API endpoint tests | Feature | High | Pending | [tasks/02-10-write-api-endpoint-tests.md](./tasks/02-10-write-api-endpoint-tests.md) |
| 2.11 | Write GitHub integration tests | Feature | Medium | Pending | [tasks/02-11-write-github-integration-tests.md](./tasks/02-11-write-github-integration-tests.md) |

---

## Epic 3: MCP Server & Role Profiles
Priority: **High** | Effort: **18-25 days** | Dependencies: Epic 2

| # | Task | Type | Priority | Status | File |
|---|------|------|----------|--------|------|
| 3.1 | Set up MCP server | Feature | High | Pending | [tasks/03-01-setup-mcp-server.md](./tasks/03-01-setup-mcp-server.md) |
| 3.2 | Implement tag-based role filtering | Feature | High | Pending | [tasks/03-02-implement-tag-based-role-filtering.md](./tasks/03-02-implement-tag-based-role-filtering.md) |
| 3.3 | Define PM role tools | Feature | High | Pending | [tasks/03-03-define-pm-role-tools.md](./tasks/03-03-define-pm-role-tools.md) |
| 3.4 | Define Dev role tools | Feature | High | Pending | [tasks/03-04-define-dev-role-tools.md](./tasks/03-04-define-dev-role-tools.md) |
| 3.5 | Define shared tools | Feature | High | Pending | [tasks/03-05-define-shared-tools.md](./tasks/03-05-define-shared-tools.md) |
| 3.6 | Support stdio transport | Feature | High | Pending | [tasks/03-06-support-stdio-transport.md](./tasks/03-06-support-stdio-transport.md) |
| 3.7 | Support streamable HTTP transport | Feature | Medium | Pending | [tasks/03-07-support-streamable-http-transport.md](./tasks/03-07-support-streamable-http-transport.md) |
| 3.8 | Add MCP server to composition root | Feature | High | Pending | [tasks/03-08-add-mcp-server-to-composition-root.md](./tasks/03-08-add-mcp-server-to-composition-root.md) |
| 3.9 | Write MCP integration tests | Feature | High | Pending | [tasks/03-09-write-mcp-integration-tests.md](./tasks/03-09-write-mcp-integration-tests.md) |
| 3.10 | Test with Claude Code | Feature | High | Pending | [tasks/03-10-test-with-claude-code.md](./tasks/03-10-test-with-claude-code.md) |
| 3.11 | Document MCP server configuration | Docs | Medium | Pending | [tasks/03-11-document-mcp-server-configuration.md](./tasks/03-11-document-mcp-server-configuration.md) |

---

## Epic 4: Meridian CLI (Go)
Priority: **Medium** | Effort: **12-18 days** | Dependencies: Epic 2

| # | Task | Type | Priority | Status | File |
|---|------|------|----------|--------|------|
| 4.1 | Generate Go API client from OpenAPI spec | Feature | High | Pending | [tasks/04-01-generate-go-api-client.md](./tasks/04-01-generate-go-api-client.md) |
| 4.2 | Set up Cobra command structure | Feature | High | Pending | [tasks/04-02-setup-cobra-command-structure.md](./tasks/04-02-setup-cobra-command-structure.md) |
| 4.3 | Implement `meridian overview` | Feature | High | Pending | [tasks/04-03-implement-meridian-overview.md](./tasks/04-03-implement-meridian-overview.md) |
| 4.4 | Implement `meridian issues list` | Feature | High | Pending | [tasks/04-04-implement-meridian-issues-list.md](./tasks/04-04-implement-meridian-issues-list.md) |
| 4.5 | Implement `meridian issues create` | Feature | High | Pending | [tasks/04-05-implement-meridian-issues-create.md](./tasks/04-05-implement-meridian-issues-create.md) |
| 4.6 | Implement `meridian issues update` | Feature | Medium | Pending | [tasks/04-06-implement-meridian-issues-update.md](./tasks/04-06-implement-meridian-issues-update.md) |
| 4.7 | Implement `meridian config` | Feature | Medium | Pending | [tasks/04-07-implement-meridian-config.md](./tasks/04-07-implement-meridian-config.md) |
| 4.8 | Add Lipgloss styling | Feature | Low | Pending | [tasks/04-08-add-lipgloss-styling.md](./tasks/04-08-add-lipgloss-styling.md) |
| 4.9 | Implement output format options | Feature | Medium | Pending | [tasks/04-09-implement-output-format-options.md](./tasks/04-09-implement-output-format-options.md) |
| 4.10 | Write CLI tests | Feature | High | Pending | [tasks/04-10-write-cli-tests.md](./tasks/04-10-write-cli-tests.md) |
| 4.11 | Cross-compile binaries | Feature | Medium | Pending | [tasks/04-11-cross-compile-binaries.md](./tasks/04-11-cross-compile-binaries.md) |
| 4.12 | Document CLI usage and commands | Docs | Medium | Pending | [tasks/04-12-document-cli-usage-and-commands.md](./tasks/04-12-document-cli-usage-and-commands.md) |

---

## Epic 5: Meridian Tracker (Python)
Priority: **Medium** | Effort: **14-20 days** | Dependencies: Epic 1

| # | Task | Type | Priority | Status | File |
|---|------|------|----------|--------|------|
| 5.1 | Set up FastAPI project structure | Feature | High | Pending | [tasks/05-01-setup-fastapi-project-structure.md](./tasks/05-01-setup-fastapi-project-structure.md) |
| 5.2 | Design tracker domain model | Feature | High | Pending | [tasks/05-02-design-tracker-domain-model.md](./tasks/05-02-design-tracker-domain-model.md) |
| 5.3 | Implement SQLite storage backend | Feature | High | Pending | [tasks/05-03-implement-sqlite-storage-backend.md](./tasks/05-03-implement-sqlite-storage-backend.md) |
| 5.4 | Implement flat file storage backend | Feature | Medium | Pending | [tasks/05-04-implement-flat-file-storage-backend.md](./tasks/05-04-implement-flat-file-storage-backend.md) |
| 5.5 | Implement REST API routes | Feature | High | Pending | [tasks/05-05-implement-rest-api-routes.md](./tasks/05-05-implement-rest-api-routes.md) |
| 5.6 | Auto-generate Tracker OpenAPI spec | Feature | Medium | Pending | [tasks/05-06-auto-generate-tracker-openapi-spec.md](./tasks/05-06-auto-generate-tracker-openapi-spec.md) |
| 5.7 | Implement Tracker adapter in Heart | Feature | High | Pending | [tasks/05-07-implement-tracker-adapter-in-heart.md](./tasks/05-07-implement-tracker-adapter-in-heart.md) |
| 5.8 | Implement Tracker domain mappers | Feature | High | Pending | [tasks/05-08-implement-tracker-domain-mappers.md](./tasks/05-08-implement-tracker-domain-mappers.md) |
| 5.9 | Write Tracker API tests | Feature | High | Pending | [tasks/05-09-write-tracker-api-tests.md](./tasks/05-09-write-tracker-api-tests.md) |
| 5.10 | Write adapter integration tests | Feature | High | Pending | [tasks/05-10-write-adapter-integration-tests.md](./tasks/05-10-write-adapter-integration-tests.md) |
| 5.11 | Document Tracker setup and API | Docs | Medium | Pending | [tasks/05-11-document-tracker-setup-and-api.md](./tasks/05-11-document-tracker-setup-and-api.md) |

---

## Epic 6: Integration, Docs & Polish
Priority: **High** | Effort: **14-20 days** | Dependencies: Epics 3, 4, 5

| # | Task | Type | Priority | Status | File |
|---|------|------|----------|--------|------|
| 6.1 | E2E testing: LLM → MCP → Heart → GitHub | Feature | High | Pending | [tasks/06-01-e2e-testing-mcp-github.md](./tasks/06-01-e2e-testing-mcp-github.md) |
| 6.2 | E2E testing: CLI → Heart → GitHub | Feature | High | Pending | [tasks/06-02-e2e-testing-cli-github.md](./tasks/06-02-e2e-testing-cli-github.md) |
| 6.3 | E2E testing: MCP → Heart → Meridian Tracker | Feature | High | Pending | [tasks/06-03-e2e-testing-mcp-tracker.md](./tasks/06-03-e2e-testing-mcp-tracker.md) |
| 6.4 | Adapter switching verification | Feature | Medium | Pending | [tasks/06-04-adapter-switching-verification.md](./tasks/06-04-adapter-switching-verification.md) |
| 6.5 | Audit log review | Feature | Medium | Pending | [tasks/06-05-audit-log-review.md](./tasks/06-05-audit-log-review.md) |
| 6.6 | Error handling audit | Refactor | High | Pending | [tasks/06-06-error-handling-audit.md](./tasks/06-06-error-handling-audit.md) |
| 6.7 | Write README with quickstart guide | Docs | High | Pending | [tasks/06-07-write-readme-quickstart-guide.md](./tasks/06-07-write-readme-quickstart-guide.md) |
| 6.8 | Write architecture documentation | Docs | Medium | Pending | [tasks/06-08-write-architecture-documentation.md](./tasks/06-08-write-architecture-documentation.md) |
| 6.9 | Write MCP server usage guide | Docs | Medium | Pending | [tasks/06-09-write-mcp-server-usage-guide.md](./tasks/06-09-write-mcp-server-usage-guide.md) |
| 6.10 | Write CLI installation and usage guide | Docs | Medium | Pending | [tasks/06-10-write-cli-installation-usage-guide.md](./tasks/06-10-write-cli-installation-usage-guide.md) |
| 6.11 | Write adapter development guide | Docs | Medium | Pending | [tasks/06-11-write-adapter-development-guide.md](./tasks/06-11-write-adapter-development-guide.md) |
| 6.12 | Set up GitHub releases | Feature | Medium | Pending | [tasks/06-12-setup-github-releases.md](./tasks/06-12-setup-github-releases.md) |
| 6.13 | Performance baseline | Feature | Low | Pending | [tasks/06-13-performance-baseline.md](./tasks/06-13-performance-baseline.md) |

---

## Notes
- **Quality focus:** High quality prioritized — testing tasks are first-class, architecture boundaries explicit, validation steps included
- **Critical path:** Epic 1 → Epic 2 → Epic 3 → Epic 6 (determines minimum project duration)
- **Parallelization:** Epics 3, 4, 5 can run in parallel once their dependencies are met
- **Cross-language:** Tasks in Epic 5 span Python (5.1-5.6, 5.9) and TypeScript (5.7, 5.8, 5.10)
- **ESLint with @antfu/eslint-config** used instead of Prettier for formatting
- **Schema flow:** Zod schemas defined once propagate to MCP validation, REST validation, OpenAPI spec, and Go client generation
