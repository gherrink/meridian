# Task 2.7: Implement Config Manager

> **Epic:** GitHub Adapter & REST API
> **Type:** Feature
> **Priority:** High
> **Effort:** Small (< 1 day)
> **Dependencies:** 1.1
> **Status:** Pending

## Goal
Implement a configuration manager that handles adapter selection, credentials, port configuration, and runtime settings — all via environment variables.

## Background
The Heart needs to know which adapter to use (GitHub, local tracker, future JIRA), what credentials to provide, and how to configure its servers. All configuration is via environment variables (with `.env` file support for development). The config manager validates required settings at startup and provides typed access throughout the application.

## Acceptance Criteria
- [ ] Config loaded from environment variables with `.env` file support
- [ ] Adapter selection: `MERIDIAN_ADAPTER` (github | local)
- [ ] GitHub config: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`
- [ ] Server config: `HEART_PORT`, `MCP_TRANSPORT`, `MCP_HTTP_PORT`
- [ ] Logging config: `LOG_LEVEL`, `AUDIT_LOG_PATH`
- [ ] Validation at startup: missing required vars produce clear error messages
- [ ] Typed config object (not raw `process.env` access throughout the codebase)
- [ ] Config is immutable after loading (no runtime mutation)

## Subtasks
- [ ] Define config schema with Zod (validate all env vars with types and defaults)
- [ ] Implement config loader that reads env vars and `.env` file
- [ ] Add validation with clear error messages for missing/invalid config
- [ ] Define adapter-specific config sections (GitHub needs token/owner/repo; local needs tracker URL)
- [ ] Export typed config interface for dependency injection
- [ ] Write tests for config validation (missing vars, invalid values, defaults)

## Notes
- Use a minimal `.env` loader (e.g., `dotenv`) — avoid heavyweight config frameworks
- Config schema defined with Zod keeps it consistent with the rest of the project's validation approach
- Default values should favor development convenience: `HEART_PORT=3000`, `LOG_LEVEL=info`, `MCP_TRANSPORT=stdio`
- The config manager lives in the `heart` package (composition root) since it's an infrastructure concern, not domain logic
