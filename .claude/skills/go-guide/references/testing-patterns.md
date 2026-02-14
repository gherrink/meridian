# Testing Patterns — CLI (Go)

## Overview

The CLI uses Go's standard `testing` package with testify for assertions. Tests are table-driven where appropriate.

## Running Tests

```bash
# All tests
go test ./...

# Specific package
go test ./internal/client/...

# Verbose
go test -v ./...

# With coverage
go test -cover ./...
```

## Patterns

### Table-driven tests

```go
func TestMapStatus(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        expected Status
        wantErr  bool
    }{
        {
            name:     "open status",
            input:    "open",
            expected: StatusOpen,
        },
        {
            name:     "closed status",
            input:    "closed",
            expected: StatusClosed,
        },
        {
            name:    "invalid status",
            input:   "unknown",
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := MapStatus(tt.input)
            if tt.wantErr {
                assert.Error(t, err)
                return
            }
            assert.NoError(t, err)
            assert.Equal(t, tt.expected, result)
        })
    }
}
```

### HTTP client tests

```go
func TestHeartClient_GetOverview(t *testing.T) {
    // Arrange
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        assert.Equal(t, "/api/v1/overview", r.URL.Path)
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(OverviewResponse{
            TotalIssues: 42,
            OpenIssues:  15,
        })
    }))
    defer server.Close()

    client := NewHeartClient(server.URL)

    // Act
    overview, err := client.GetOverview()

    // Assert
    assert.NoError(t, err)
    assert.Equal(t, 42, overview.TotalIssues)
    assert.Equal(t, 15, overview.OpenIssues)
}
```

### Cobra command tests

```go
func TestOverviewCmd(t *testing.T) {
    // Arrange
    buf := new(bytes.Buffer)
    cmd := NewOverviewCmd()
    cmd.SetOut(buf)
    cmd.SetArgs([]string{"--format", "json"})

    // Act
    err := cmd.Execute()

    // Assert
    assert.NoError(t, err)
    assert.Contains(t, buf.String(), "totalIssues")
}
```

## Conventions

- Test file: `[name]_test.go` alongside source file
- Test function: `TestFunctionName_Description`
- Use `t.Run()` for subtests
- Table-driven tests for 3+ cases
- Use `testify/assert` for assertions, not manual `if` checks
- Use `httptest.NewServer` for HTTP client tests
- Use interfaces for mockable dependencies
- No test data in source files — define in test files or `testdata/` directory
