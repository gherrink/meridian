# Task 4.9: Implement Output Format Options

> **Epic:** Meridian CLI (Go)
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 4.3, 4.4
> **Status:** Pending

## Goal
Implement the `--output` flag across all commands with support for table, JSON, and plain text formats. This enables scripting, piping, and integration with other tools.

## Background
Different use cases need different output formats: humans want pretty tables, scripts want JSON, and pipe-friendly workflows want plain text (no colors, no borders). A consistent `--output` flag across all commands makes the CLI versatile.

## Acceptance Criteria
- [ ] `--output table` (default): styled table output with colors and borders
- [ ] `--output json`: machine-readable JSON output (raw API response or structured CLI output)
- [ ] `--output plain`: plain text, no colors, no borders — suitable for piping and grep
- [ ] Flag available on all commands that produce output
- [ ] JSON output is valid JSON (parseable by `jq`)
- [ ] Plain output is tab-separated (parseable by `awk`, `cut`)
- [ ] Default format configurable via `meridian config set output_format json`

## Subtasks
- [ ] Define output format enum and global flag
- [ ] Create output formatter interface with table, JSON, and plain implementations
- [ ] Apply formatter to `meridian overview`
- [ ] Apply formatter to `meridian issues list`
- [ ] Apply formatter to `meridian issues create` (confirmation)
- [ ] Apply formatter to `meridian issues update` (confirmation)
- [ ] Read default format from config (fallback to table)
- [ ] Write tests for each output format

## Notes
- JSON output should match the API response structure for consistency — developers can rely on the same shape
- Plain output is important for shell scripting: `meridian issues list --output plain | grep "in_progress" | wc -l`
- Consider `--output wide` for table format with additional columns (description preview, dates)
- The formatter interface pattern makes it easy to add new formats (e.g., YAML, CSV) in the future
