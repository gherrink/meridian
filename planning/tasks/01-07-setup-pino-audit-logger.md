# Task 1.7: Set Up Pino-Based Audit Logger

> **Epic:** Core Domain & Foundation
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 1.1
> **Status:** Pending

## Goal
Implement a structured audit logging system using Pino in the `shared` package. Every operation through the system (creates, updates, reads) must be logged for compliance and traceability.

## Background
Audit logging is a non-functional requirement for enterprise compliance. Pino produces NDJSON (Newline Delimited JSON) by default — each log line is a valid JSON object with timestamp, level, and context. This makes logs machine-parseable and easy to ship to log aggregators. The audit logger will be used by all use cases to record operations.

## Acceptance Criteria
- [ ] Pino-based logger configured in the `shared` package
- [ ] Structured JSON output with timestamp, level, operation, user, and context fields
- [ ] Configurable log level (debug, info, warn, error) via environment variable
- [ ] Configurable output sink (stdout, file path) via environment variable
- [ ] Audit-specific log method that enforces required fields (operation, actor, resource)
- [ ] Logger interface defined (not coupled to Pino directly) for testability
- [ ] Logger can be injected into use cases via dependency injection

## Subtasks
- [ ] Install Pino 9.x in the `shared` package
- [ ] Define a logger interface (abstraction over Pino for testability)
- [ ] Define audit log entry structure (operation, actor, resource_type, resource_id, timestamp, metadata)
- [ ] Implement Pino-based logger that satisfies the interface
- [ ] Add configuration for log level (`LOG_LEVEL` env var)
- [ ] Add configuration for output sink (`AUDIT_LOG_PATH` env var — stdout if not set)
- [ ] Implement a no-op/mock logger for testing
- [ ] Write tests for audit log entry formatting

## Notes
- The logger interface should be simple enough that a no-op implementation is trivial — this is critical for test performance
- Pino's child logger feature is useful for adding context (e.g., request ID, adapter name) without passing it on every call
- Do not log sensitive data (tokens, credentials) — define a scrubbing policy
- `AUDIT_LOG_PATH` defaults to stdout for development; file output for production
