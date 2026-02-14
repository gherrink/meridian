---
name: go-guide
description: Go conventions and patterns for the Meridian CLI (Cobra, Bubbletea, Viper). Used by developer and test-writer agents when working on cli/* code. Contains references for Cobra commands, Bubbletea TUI, and testing.
---

# Go Guide — CLI

This guide defines the conventions for all Go code in the Meridian CLI (`cli/`). Agents must follow these patterns when writing or reviewing Go code.

## Project Setup

- **Language**: Go 1.22+
- **Module**: `github.com/gherrink/meridian/cli`
- **Dependencies**: managed via `go.mod`
- **Linting**: golangci-lint

## Key Libraries

| Library | Purpose |
|---------|---------|
| Cobra | CLI command framework |
| Bubbletea | Terminal UI (TUI) framework |
| Lipgloss | Terminal styling |
| Viper | Configuration management |
| Glamour | Markdown rendering in terminal |

## Directory Structure

```
cli/
  cmd/
    root.go             # Root command, global flags
    overview.go         # meridian overview command
    issues.go           # meridian issues command
    config.go           # meridian config command
  internal/
    tui/
      overview/         # Bubbletea model for overview screen
      issues/           # Bubbletea model for issues screen
      components/       # Shared TUI components
      styles/           # Lipgloss style definitions
    client/
      heart.go          # HTTP client for Heart REST API
      types.go          # Response/request types
    config/
      config.go         # Viper configuration
  main.go
  go.mod
  go.sum
```

## Coding Conventions

- **Naming**: Follow Go conventions — short variable names for small scopes, descriptive for larger scopes
- **Errors**: Return errors, don't panic. Use `fmt.Errorf("context: %w", err)` for wrapping.
- **Packages**: Small, focused packages. No circular dependencies.
- **Interfaces**: Define at the consumer side, not the producer side. Keep interfaces small.
- **Comments**: Exported symbols must have doc comments starting with the symbol name.
- **Formatting**: `gofmt` / `goimports` — no manual formatting.

## Command Patterns

See `references/cobra-patterns.md` for detailed Cobra patterns.

## TUI Patterns

See `references/bubbletea-patterns.md` for detailed Bubbletea patterns.

## Testing

See `references/testing-patterns.md` for detailed testing patterns.

- **Framework**: Go standard `testing` package + testify for assertions
- **Location**: `_test.go` files alongside source
- **Naming**: `TestFunctionName_Description`
- **Style**: Table-driven tests for multiple cases
