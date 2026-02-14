# Task 4.3: Implement `meridian overview`

> **Epic:** Meridian CLI (Go)
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 4.2
> **Status:** Pending

## Goal
Implement the `meridian overview` command that displays a project summary with issue counts, status breakdown, and milestone progress using a Bubbletea TUI.

## Background
The overview command is the CLI's flagship feature — a quick snapshot of project health. It calls the Heart's `GET /api/v1/projects/:id/overview` endpoint and renders the data as a rich terminal UI with Bubbletea and Lipgloss. This is the first command developers will run to get oriented in a project.

## Acceptance Criteria
- [ ] `meridian overview` fetches project overview from Heart API
- [ ] Displays project name and description
- [ ] Shows issue count breakdown by status (open, in_progress, closed)
- [ ] Shows issue count breakdown by priority (urgent, high, normal, low)
- [ ] Shows milestone/epic progress (if available)
- [ ] Renders as a Bubbletea TUI with clean layout
- [ ] Falls back to plain text output when `--output plain` is specified
- [ ] Handles API errors gracefully (connection refused, auth failure, not found)
- [ ] Uses default project from config if no project ID specified

## Subtasks
- [ ] Implement API call to `GET /api/v1/projects/:id/overview` via service layer
- [ ] Design TUI layout for overview (header, status section, priority section, progress section)
- [ ] Implement Bubbletea model for overview display
- [ ] Add Lipgloss styling (colors for status, borders, alignment)
- [ ] Implement plain text fallback output
- [ ] Handle missing/unavailable data gracefully (show "N/A" not crash)
- [ ] Add `--project` flag to specify project ID (overrides config default)
- [ ] Write tests for API response → TUI model mapping
- [ ] Test error handling (connection refused, 404, 401)

## Notes
- The TUI should be informative at a glance — a developer should understand project status in 5 seconds
- Color coding: green for closed/done, yellow for in_progress, red for urgent priority
- Consider making the overview non-interactive (just render and exit) rather than a full Bubbletea interactive app — simpler and faster for a dashboard command
- If Bubbletea is overkill for a static display, Lipgloss alone may suffice for styled output
