---
name: go-guide
description: Go conventions and patterns for the Meridian CLI (Cobra, Bubbletea, Viper). Used by developer and test-writer agents when working on cli/* code. Contains references for Cobra commands, Bubbletea TUI, and testing.
---

# Go Guide — CLI

Conventions for all Go code in `cli/`. Follow these when writing or reviewing code.

## Key Libraries

| Library | Purpose |
|---------|---------|
| Cobra | CLI command framework |
| Bubbletea | Terminal UI (TUI) framework |
| Lipgloss | Terminal styling |
| Viper | Configuration management |
| Glamour | Markdown rendering in terminal |

## Coding Conventions

- **Naming**: Short variable names for small scopes, descriptive for larger scopes
- **Errors**: Return errors, don't panic. Use `fmt.Errorf("context: %w", err)` for wrapping
- **Packages**: Small, focused. No circular dependencies
- **Interfaces**: Define at the consumer side, keep small
- **Comments**: Exported symbols must have doc comments starting with the symbol name
- **Formatting**: `gofmt` / `goimports` — no manual formatting

## Patterns

- **Commands**: See `references/cobra-patterns.md`
- **TUI**: See `references/bubbletea-patterns.md`

## Testing

See `references/testing-patterns.md` for detailed patterns.

- **Framework**: Go standard `testing` package + testify
- **Location**: `_test.go` files alongside source
- **Naming**: `TestFunctionName_Description`
- **Style**: Table-driven tests for multiple cases

## Verification

```bash
cd cli && go vet ./...      # Check for common issues
cd cli && go build ./...    # Verify compilation
```
