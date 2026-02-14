# Bubbletea TUI Patterns — CLI

## Overview

The Meridian CLI uses Bubbletea for interactive terminal UI screens. Each screen is a Bubbletea model with Init, Update, and View methods.

## Model Pattern

```go
// internal/tui/overview/model.go
package overview

import (
    "github.com/charmbracelet/bubbletea"
    "github.com/charmbracelet/lipgloss"
)

type state int

const (
    stateLoading state = iota
    stateReady
    stateError
)

type Model struct {
    state    state
    data     OverviewData
    err      error
    width    int
    height   int
    styles   Styles
}

type OverviewData struct {
    TotalIssues int
    OpenIssues  int
    // ...
}

func New() Model {
    return Model{
        state:  stateLoading,
        styles: DefaultStyles(),
    }
}

func (m Model) Init() tea.Cmd {
    return fetchOverview // Start by fetching data
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case tea.KeyMsg:
        switch msg.String() {
        case "q", "ctrl+c":
            return m, tea.Quit
        }

    case tea.WindowSizeMsg:
        m.width = msg.Width
        m.height = msg.Height

    case overviewMsg:
        m.state = stateReady
        m.data = msg.data

    case errMsg:
        m.state = stateError
        m.err = msg.err
    }
    return m, nil
}

func (m Model) View() string {
    switch m.state {
    case stateLoading:
        return "Loading overview..."
    case stateError:
        return m.styles.Error.Render("Error: " + m.err.Error())
    case stateReady:
        return m.renderOverview()
    }
    return ""
}
```

## Message Types

```go
// Messages for async operations
type overviewMsg struct {
    data OverviewData
}

type errMsg struct {
    err error
}

// Commands that produce messages
func fetchOverview() tea.Msg {
    data, err := client.GetOverview()
    if err != nil {
        return errMsg{err: err}
    }
    return overviewMsg{data: data}
}
```

## Styles

```go
// internal/tui/styles/styles.go
package styles

import "github.com/charmbracelet/lipgloss"

var (
    Title    = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("205"))
    Subtle   = lipgloss.NewStyle().Foreground(lipgloss.Color("241"))
    Error    = lipgloss.NewStyle().Foreground(lipgloss.Color("196"))
    Success  = lipgloss.NewStyle().Foreground(lipgloss.Color("82"))
)
```

## Running a TUI Screen

```go
func Run() error {
    p := tea.NewProgram(New(), tea.WithAltScreen())
    _, err := p.Run()
    return err
}
```

## Conventions

- One model per screen in its own package under `internal/tui/`
- State enum for model lifecycle (loading, ready, error)
- All async operations via Bubbletea commands (Cmd), never goroutines
- Styles defined centrally or per-model, using Lipgloss
- Handle `tea.WindowSizeMsg` for responsive layouts
- Always handle `q` and `ctrl+c` for quitting
- Shared components (spinners, tables, help text) in `internal/tui/components/`
