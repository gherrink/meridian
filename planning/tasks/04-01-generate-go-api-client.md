# Task 4.1: Generate Go API Client from OpenAPI Spec

> **Epic:** Meridian CLI (Go)
> **Type:** Feature
> **Priority:** High
> **Effort:** Small (< 1 day)
> **Dependencies:** 2.6
> **Status:** Pending

## Goal
Generate a type-safe Go API client from the Heart's OpenAPI spec using oapi-codegen, and wrap it in a thin service layer that insulates the CLI from regeneration churn.

## Background
The Go CLI communicates with the Heart via its REST API. Instead of hand-writing an HTTP client, we generate one from the OpenAPI spec — ensuring type safety and contract alignment. oapi-codegen produces idiomatic Go code with types, client functions, and request/response structures. A thin service layer wraps the generated code so the CLI isn't directly coupled to generated types.

## Acceptance Criteria
- [ ] oapi-codegen generates Go types and client from Heart's OpenAPI spec
- [ ] Generated code compiles without modification
- [ ] Service layer wraps generated client with application-specific methods
- [ ] Service layer translates between generated types and CLI-friendly types
- [ ] Generation is reproducible: running `go generate` produces the same output
- [ ] Generated code is committed to the repo (not generated at build time)

## Subtasks
- [ ] Set up Go module in `cli/` directory (`go mod init`)
- [ ] Install oapi-codegen as a development dependency
- [ ] Configure oapi-codegen to generate client and types from Heart's `openapi.json`
- [ ] Add `go generate` directive for reproducible generation
- [ ] Create service layer that wraps generated client methods
- [ ] Define CLI-friendly types (if generated types are unwieldy)
- [ ] Verify generated client can make requests to a running Heart instance
- [ ] Document the regeneration process (when Heart API changes)

## Notes
- Generated code should be in `internal/api/generated/` — clearly separated from hand-written code
- The service layer in `internal/api/client.go` wraps generated code — this is where error handling, retries, and type translations happen
- When the Heart API changes: regenerate → update service layer → update CLI commands
- Consider generating only the client (not server) code — the CLI doesn't need server stubs
- oapi-codegen config file (`.oapi-codegen.yaml`) should specify generation options
