# Task 4.8: Add Lipgloss Styling

> **Epic:** Meridian CLI (Go)
> **Type:** Feature
> **Priority:** Low
> **Effort:** Small (< 1 day)
> **Dependencies:** 4.3, 4.4, 4.5, 4.6
> **Status:** Pending

## Goal
Apply consistent Lipgloss styling across all CLI commands — colors, borders, status indicators, and a cohesive visual theme.

## Background
Lipgloss provides declarative terminal styling for Go CLIs — colors, borders, padding, alignment. Individual commands may have basic styling from their implementation, but this task ensures visual consistency across the entire CLI with a defined theme and reusable style components.

## Acceptance Criteria
- [ ] Consistent color scheme across all commands
- [ ] Status indicators color-coded: open (blue), in_progress (yellow), closed (green)
- [ ] Priority indicators: urgent (red), high (orange), normal (default), low (gray)
- [ ] Table borders consistent across list and overview commands
- [ ] Headers styled consistently (bold, colored)
- [ ] Error messages styled in red
- [ ] Success messages styled in green
- [ ] Styles adapt to terminal color capabilities (256-color, truecolor, no-color)
- [ ] `NO_COLOR` environment variable respected (disable all colors)

## Subtasks
- [ ] Define color palette and theme constants
- [ ] Create reusable Lipgloss style definitions (header, table, status badge, error, success)
- [ ] Apply consistent styles to `meridian overview`
- [ ] Apply consistent styles to `meridian issues list`
- [ ] Apply consistent styles to `meridian issues create` (confirmation output)
- [ ] Apply consistent styles to `meridian issues update` (confirmation output)
- [ ] Test with different terminal color capabilities
- [ ] Implement `NO_COLOR` support

## Notes
- Lipgloss automatically detects terminal color capabilities — use its built-in detection
- The `NO_COLOR` standard (https://no-color.org/) should be respected for accessibility
- Keep styling subtle and functional — the goal is readability, not decoration
- Consider a `--no-color` flag as an alternative to the environment variable
- This is a polish task — the CLI should be fully functional before this task starts
