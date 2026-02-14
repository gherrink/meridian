# Task 6.5: Audit Log Review

> **Epic:** Integration, Docs & Polish
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 2.9, 1.7
> **Status:** Pending

## Goal
Review and verify that all operations through the system are correctly logged in the audit log with appropriate context and structure.

## Background
Audit logging is an enterprise compliance requirement. Every create, update, delete, and read operation should be logged with: who did it, what they did, when, and on what resource. This task reviews the actual log output to ensure nothing is missing and the format is consistent.

## Acceptance Criteria
- [ ] Create operations logged with: operation type, actor, resource type, resource ID, timestamp
- [ ] Update operations logged with: operation type, actor, resource type, resource ID, changed fields
- [ ] Delete operations logged with: operation type, actor, resource type, resource ID
- [ ] Read operations logged (at least list/search operations)
- [ ] Error operations logged with error type and context
- [ ] Logs are valid NDJSON (each line parseable as JSON)
- [ ] No sensitive data in logs (tokens, passwords)
- [ ] Log output is consistent between REST API and MCP server paths

## Subtasks
- [ ] Run a series of operations through REST API and capture audit log
- [ ] Run same operations through MCP server and capture audit log
- [ ] Verify all operation types are logged
- [ ] Verify log entry structure is consistent
- [ ] Check for sensitive data leakage (search for token patterns)
- [ ] Verify NDJSON format (parse each line as JSON)
- [ ] Compare REST vs MCP log entries for the same operations (should be identical use case logs)
- [ ] Document any missing log entries and fix them

## Notes
- This is a review and verification task — fix any issues found during the review
- Use `jq` to parse and validate NDJSON output
- Consider a log analysis script that checks for required fields in each entry
- The audit log format should be documented for operations teams who may need to set up log ingestion
