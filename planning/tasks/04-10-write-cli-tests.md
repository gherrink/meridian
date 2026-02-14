# Task 4.10: Write CLI Tests

> **Epic:** Meridian CLI (Go)
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 4.3, 4.4, 4.5, 4.6
> **Status:** Pending

## Goal
Write comprehensive tests for the CLI using Go's testing stdlib, golden file testing for output verification, and service layer mocking for API isolation.

## Background
CLI tests verify that commands parse flags correctly, call the right API endpoints, and produce the expected output. Golden file testing stores expected output as files — tests compare actual output against golden files. This catches unintended output changes and makes it easy to update expected output when changes are intentional.

## Acceptance Criteria
- [ ] All commands have test coverage for happy path
- [ ] All commands have test coverage for error paths (API errors, invalid flags)
- [ ] Golden files for all command outputs (table, JSON, plain formats)
- [ ] Flag parsing tested for all commands
- [ ] API client mocked (no real HTTP calls in tests)
- [ ] Tests run with `go test ./...` and complete in under 10 seconds
- [ ] Golden file update mechanism: `go test -update` regenerates golden files

## Subtasks
- [ ] Set up golden file testing infrastructure (read/compare/update helpers)
- [ ] Create mock API client service for testing (returns canned responses)
- [ ] Write tests for `meridian overview`: golden file for table/json/plain output
- [ ] Write tests for `meridian issues list`: golden file, filter flag parsing
- [ ] Write tests for `meridian issues create`: flag parsing, interactive mode, dry-run
- [ ] Write tests for `meridian issues update`: flag parsing, error handling
- [ ] Write tests for `meridian config`: get, set, init
- [ ] Write tests for error scenarios: connection refused, 401, 404, 500
- [ ] Add golden file update flag (`-update`)
- [ ] Verify all tests pass in CI

## Notes
- Golden file testing pattern: `testdata/golden/overview-table.txt`, `testdata/golden/issues-list-json.json`, etc.
- Use `testify` for assertions — cleaner than stdlib `if` checks
- Mock the service layer, not the HTTP client — tests should verify command logic, not HTTP handling
- Consider table-driven tests for flag parsing (multiple test cases in one test function)
- Golden files should use a fixed terminal width for deterministic output
