# Task 4.6: Implement `meridian issues update`

> **Epic:** Meridian CLI (Go)
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 4.2
> **Status:** Pending

## Goal
Implement the `meridian issues update` command for changing issue status, assignments, priority, and other fields.

## Background
Developers frequently need to update issue status (start working, mark done), change assignments, or adjust priority. The update command provides quick flag-based updates via `PATCH /api/v1/issues/:id`. It's designed for speed — no interactive prompts by default.

## Acceptance Criteria
- [ ] `meridian issues update <id>` with update flags
- [ ] `--status` flag: change issue status (e.g., `--status in_progress`)
- [ ] `--assignee` flag: change assignee
- [ ] `--priority` flag: change priority
- [ ] `--title` flag: change title
- [ ] Updated issue details displayed on success
- [ ] Handles not-found errors gracefully
- [ ] Handles validation errors (invalid status, invalid priority) with helpful messages

## Subtasks
- [ ] Implement flag parsing for all updateable fields
- [ ] Implement API call to `PATCH /api/v1/issues/:id` via service layer
- [ ] Display updated issue confirmation with changed fields highlighted
- [ ] Handle 404 (issue not found) with clear message
- [ ] Handle 422 (validation error) with field-specific messages
- [ ] Write tests for flag parsing and error handling

## Notes
- Update is intentionally non-interactive — it's a quick operation, often used in scripts or workflows
- Consider shortcuts: `meridian issues update 5 --done` as alias for `--status closed`
- Only send changed fields in the PATCH request (don't send unchanged fields as null)
- This pairs well with `meridian issues list` — list → pick an issue → update it
