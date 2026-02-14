# Task 2.9: Implement Composition Root

> **Epic:** GitHub Adapter & REST API
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 2.1, 2.3, 2.5, 2.7, 2.8, 1.7
> **Status:** Pending

## Goal
Implement the composition root in the `heart` package — the single place where all dependencies are wired together and servers are started. This is the application's entry point.

## Background
In hexagonal architecture, the composition root is where dependency injection happens. It reads config, creates the appropriate adapter instances, injects them into use cases, injects use cases into the REST API and MCP server, and starts the HTTP server. The heart package has no business logic — it only wires and starts.

## Acceptance Criteria
- [ ] Config loaded and validated at startup
- [ ] Correct adapter selected based on `MERIDIAN_ADAPTER` config
- [ ] Adapter instances created with proper credentials
- [ ] Use cases created with injected adapter instances
- [ ] Audit logger created and injected into use cases
- [ ] REST API created with injected use cases, started on configured port
- [ ] Application starts successfully with `MERIDIAN_ADAPTER=github` and valid GitHub credentials
- [ ] Application starts successfully with in-memory adapter for development/testing
- [ ] Graceful shutdown: handles SIGTERM/SIGINT, closes HTTP server cleanly
- [ ] Clear startup log showing: adapter in use, server port, transport mode

## Subtasks
- [ ] Create `main.ts` entry point in `heart` package
- [ ] Implement adapter factory: config → adapter instances (GitHub, local, or in-memory)
- [ ] Wire use cases with selected adapter instances and audit logger
- [ ] Wire REST API with use cases
- [ ] Start HTTP server on configured port
- [ ] Implement graceful shutdown handler (SIGTERM, SIGINT)
- [ ] Add startup logging (adapter, port, environment)
- [ ] Add in-memory adapter option for development (`MERIDIAN_ADAPTER=memory`)
- [ ] Write tests for composition wiring (verify correct adapter is selected)

## Notes
- The composition root is the ONLY place that knows about concrete adapter implementations — everything else works with interfaces
- Consider adding a `MERIDIAN_ADAPTER=memory` option that uses in-memory adapters for local development without any external dependencies
- MCP server wiring will be added in task 3.8 — for now, only REST API needs to start
- Keep `main.ts` clean and readable — it should read like a recipe: "create config, create adapter, create use cases, create API, start server"
