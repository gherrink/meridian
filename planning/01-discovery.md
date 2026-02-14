# Phase 1: Discovery & Research

## Project Name
**Meridian** — Enterprise-Ready Project Management Standardization Tool

## Problem Statement
When working with coding agents (e.g., Claude Code), planning and issue tracking depends on whatever software is available. Project managers, developers, and AI agents all interact with planning systems differently, yet are forced into the same tool with the same interface. There is no standardized way for LLMs to interact with arbitrary issue tracking backends, and no abstraction that lets workflows remain agnostic to the underlying system.

## Functional Requirements

- **Unified Interface (Generalized Abstraction Layer):** A standardized interface (ports) to read/write issues, epics, tasks, comments, and metadata across multiple issue tracking backends
- **Backend Adapters:** Pluggable adapters for GitHub Issues, JIRA, and a local lightweight tracker. Designed for extensibility (add new backends without touching core logic)
- **Role-Based MCP Tool Exposure:** MCP server(s) that expose different tool sets to different user groups:
  - **PM profile:** create-epic, view-roadmap, assign-priority, manage-milestones, resource-overview, ...
  - **Dev profile:** pick-next-task, update-status, view-context, log-progress, ...
  - Additional profiles extensible over time
- **CLI Tool:** Developer-focused command-line tool for project overview, task management, and fast workflows. Designed to work with Claude Code. Separate system from MCP.
- **Lightweight Built-in Issue Tracker:** A simple, standalone issue tracking system with:
  - Flat file or SQLite storage (user's choice)
  - Small web API
  - Designed to potentially grow into a fuller system
  - Decoupled from the MCP/CLI layer — just another backend behind an adapter
- **Audit Logging:** All operations through the system are logged for compliance and traceability
- **Standard Operations:** Create, read, update, delete issues/tasks/epics; manage priorities and assignments; track status transitions; view project overviews and roadmaps

## Non-Functional Requirements

- **Clean Architecture (Hexagonal / Ports & Adapters):** Core domain logic is isolated from infrastructure. Adapters are swappable. Dependencies point inward.
- **Developer Friendliness:** Clear APIs, good documentation, easy local development setup, intuitive CLI experience
- **Decoupled Systems:** MCP layer, CLI tool, and lightweight tracker are independent systems connected through the generalized interface
- **Scalable Team Size:** Works for a solo developer and scales to large organizations
- **Enterprise Compliance:** Audit trails, auth delegation, structured logging
- **Auth Delegation:** Authentication and authorization handled by each backend adapter (GitHub OAuth, JIRA OAuth, local = configurable), not by the core
- **Extensibility:** New backends, new role profiles, new tools — all addable without modifying core domain logic
- **Polyglot-Ready:** Each system component may use the best-fit language (TypeScript, Go, Python evaluated per component)

## MVP Scope

### In Scope (v1)
- Core domain model + generalized interface (ports)
- GitHub Issues backend adapter (first adapter)
- MCP server with 2 role profiles (PM + Dev)
- CLI tool with basic operations (project overview, task management)
- Lightweight local tracker with SQLite/flat file storage and basic web API
- Audit logging foundation
- Developer documentation

### Deferred (v2+)
- JIRA backend adapter
- Simultaneous multi-backend support (e.g., JIRA *and* GitHub at once)
- Web UI for the lightweight tracker
- Additional role profiles (QA, Designer, Stakeholder, ...)
- Cross-backend issue migration/sync
- MCP Gateway pattern for enterprise multi-tenant deployment
- Advanced reporting and analytics
- Webhook/event system for real-time updates

## Backend Adapter Priority
1. **GitHub Issues** — first target, project will be hosted there
2. **Local Lightweight Tracker** — zero-dependency option
3. **JIRA** — enterprise adoption signal

## Domain Research

### Landscape Summary

**Existing MCP PM Servers — Fragmented:**
Several MCP servers exist for individual platforms (GitHub's official MCP server with 25k+ stars, JIRA MCP, Linear MCP, Asana community servers), but each is tightly coupled to a single backend. No existing solution provides a unified abstraction layer across multiple backends via MCP. This is the core gap Meridian fills.

**Unified API Prior Art — Apideck:**
Apideck offers a commercial Unified Issue Tracking API that normalizes data across 200+ integrations (GitHub, GitLab, JIRA, Linear, YouTrack). Their standardized data model provides a proven reference:
- **Tickets:** id, subject, description, status (open/in_progress/closed), priority (low/normal/high/urgent), assignees, tags, due_date
- **Collections:** projects/repositories with hierarchical parent_id
- **Comments:** body, created_by, timestamps
- **Users & Tags:** standard identity and labeling
- **Extension points:** `custom_mappings` and `pass_through` for backend-specific data

This validates the abstraction approach but Apideck is a hosted commercial SaaS — not MCP-based, not self-hostable, not designed for LLM workflows.

**Local/Distributed Issue Trackers:**
- **git-bug** (Go): Most mature distributed/local tracker. Offline-first, stores in git, CLI/TUI/Web interfaces. Good reference architecture but too git-coupled.
- **git-issue** (Go): Simpler git-based tracker with GitHub import/export
- Various CLI trackers exist but none designed as backends for an abstraction layer

**MCP Tool Filtering Patterns:**
The Xweather MCP server demonstrates a production-proven tag-based tool filtering approach:
- Tools grouped into canonical tags (e.g., `forecast`, `tropical`, `lightning`)
- Query parameter filters: `include_tags`, `exclude_tags`, `include_tools`, `exclude_tools`
- Strict precedence rules for filter resolution
- Directly applicable to role-based tool exposure (e.g., `?include_tags=pm` vs `?include_tags=dev`)

### Common Challenges

- **Data Model Mapping Complexity:** The hardest part of unifying issue trackers is mapping divergent concepts. JIRA has epics/stories/subtasks/sprints; GitHub has issues/milestones/labels/projects. A "lowest common denominator" model loses features; a "superset" model becomes unwieldy. The solution is a well-designed core model with extension points for backend-specific data.
- **Status/Workflow Normalization:** Every tracker has different status models. JIRA has configurable workflows with custom statuses; GitHub has open/closed. Mapping between these requires a canonical status set with per-adapter translation.
- **Auth Complexity Across Backends:** Each backend has different auth mechanisms (OAuth 2.0 flows, API tokens, PATs). Delegating auth to adapters is the right call, but the UX of configuring multiple backends needs care.
- **Tool Overload for LLMs:** Exposing too many tools to an LLM degrades performance. Role-based filtering is essential, not optional. Research confirms this is a known challenge in the MCP ecosystem.
- **Bidirectional Sync (future):** When supporting multiple backends simultaneously, conflict resolution becomes a significant challenge. Deferring this to v2+ is the right call.

### Relevant Technologies

| Technology | Relevance | Status |
|---|---|---|
| **MCP Protocol** | Core protocol for LLM tool exposure | Spec v2025-11-25 stable, wide adoption |
| **MCP SDK (TypeScript)** | Official SDK for building MCP servers | Actively maintained by Anthropic |
| **Hexagonal Architecture** | Clean architecture pattern for adapter system | Well-documented in TS and Go |
| **Octokit (GitHub API)** | GitHub Issues API client | Mature, TypeScript-native |
| **jira.js** | JIRA Cloud API client | TypeScript, actively maintained |
| **SQLite** | Lightweight tracker storage option | Universal, zero-config |
| **git-bug** | Reference for local issue tracking design | Go, mature, good UX patterns |
| **Apideck Data Model** | Reference for unified issue tracking schema | Production-proven across 200+ integrations |

## Constraints

- **Team:** Starting with own team, variable size (1 person to large org target)
- **Timeline:** No hard deadline specified; quality and clean architecture prioritized over speed
- **Budget:** Open source (MIT license) / self-hosted focus; no SaaS infrastructure costs for core system
- **Technical:** Polyglot architecture (TypeScript, Go, Python evaluated per component); clean architecture mandatory
- **First Users:** Own development team, then broader adoption

## Sources

1. [Project Management MCP Servers Overview — Merge.dev](https://www.merge.dev/blog/project-management-mcp-servers)
2. [MCP Best Practices: Architecture & Implementation Guide](https://modelcontextprotocol.info/docs/best-practices/)
3. [Project Management MCP Server (Knowledge Graph) — GitHub](https://github.com/tejpalvirk/project)
4. [MCP Tool Filtering & Scoping — Xweather](https://www.xweather.com/docs/mcp-server/filtering-tool-scoping)
5. [Apideck Unified Issue Tracking API](https://www.apideck.com/issue-tracking-api)
6. [Apideck Issue Tracking API Reference](https://developers.apideck.com/apis/issue-tracking/reference)
7. [git-bug: Distributed, Offline-First Bug Tracker — GitHub](https://github.com/git-bug/git-bug)
8. [MCP Specification v2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
9. [MCP Server Role-Based Filtering Discussion — Claude Code GitHub](https://github.com/anthropics/claude-code/issues/7328)
10. [Hexagonal Architecture with TypeScript — Better Programming](https://betterprogramming.pub/how-to-ports-and-adapter-with-typescript-32a50a0fc9eb)
11. [Go Hexagonal Architecture Framework — GitHub](https://github.com/RanchoCooper/go-hexagonal)
12. [Tool Filter MCP Server Guide — Skywork](https://skywork.ai/skypage/en/tool-filter-mcp-server-ai-engineer-guide/1980510113469079552)
13. [Orchestrating Multiple MCP Servers — Portkey](https://portkey.ai/blog/orchestrating-multiple-mcp-servers-in-a-single-ai-workflow/)
14. [Top MCP Gateways 2025 — TrueFoundry](https://www.truefoundry.com/blog/best-mcp-gateways)
15. [MCP Features Guide (Tools, Resources, Prompts) — WorkOS](https://workos.com/blog/mcp-features-guide)
