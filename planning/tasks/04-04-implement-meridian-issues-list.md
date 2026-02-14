# Task 4.4: Implement `meridian issues list`

> **Epic:** Meridian CLI (Go)
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 4.2
> **Status:** Pending

## Goal
Implement the `meridian issues list` command that displays a filterable, paginated list of issues in a table format.

## Background
Issue listing is the most frequently used CLI command. Developers need to quickly see what issues exist, filter by status or assignee, and scan priorities. The command calls `GET /api/v1/issues` with query parameters and renders results as a formatted table.

## Acceptance Criteria
- [ ] `meridian issues list` fetches and displays issues from Heart API
- [ ] Table columns: ID, title (truncated), status, priority, assignee
- [ ] Filter flags: `--status`, `--priority`, `--assignee`, `--tag`
- [ ] Pagination: `--limit` (default 25), `--offset` for manual paging
- [ ] Status column color-coded (green=closed, yellow=in_progress, default=open)
- [ ] Empty results show a helpful message (not a blank screen)
- [ ] Supports `--output json` for machine-readable output
- [ ] Supports `--output plain` for pipe-friendly output (no colors, no borders)

## Subtasks
- [ ] Implement API call to `GET /api/v1/issues` with filter query params via service layer
- [ ] Define table layout with Lipgloss styling
- [ ] Implement filter flag parsing and validation
- [ ] Implement pagination with limit/offset flags
- [ ] Add color coding for status column
- [ ] Implement JSON output format
- [ ] Implement plain text output format (tab-separated, no styling)
- [ ] Handle empty results gracefully
- [ ] Handle API errors gracefully
- [ ] Write tests for filter flag parsing and output formatting

## Notes
- Title truncation should be smart — truncate to terminal width minus other columns, add ellipsis
- Consider adding a `--all` flag that auto-paginates and fetches all results
- The `--assignee me` shortcut (resolves to current user) is a nice UX touch
- Table rendering should adapt to terminal width — narrow terminals get fewer columns
- This is a high-frequency command — optimize for quick scanning
