# Task 4.5: Implement `meridian issues create`

> **Epic:** Meridian CLI (Go)
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 4.2
> **Status:** Pending

## Goal
Implement the `meridian issues create` command with interactive prompts for creating issues. Supports both interactive mode and flag-based creation for scripting.

## Background
Creating issues from the terminal should feel natural. In interactive mode, the command prompts for title, description, priority, and assignee. In non-interactive mode (flags or piped input), all fields are provided via flags. The command calls `POST /api/v1/issues` on the Heart.

## Acceptance Criteria
- [ ] Interactive mode: prompts for title, description, priority, assignee
- [ ] Flag mode: `--title`, `--description`, `--priority`, `--assignee`, `--tag` flags
- [ ] Mixed mode: flags override interactive defaults (provide some flags, prompt for the rest)
- [ ] Created issue details displayed on success (ID, title, status, URL)
- [ ] Input validation: title required, priority must be valid enum value
- [ ] Description supports multi-line input in interactive mode
- [ ] `--dry-run` flag shows what would be created without calling the API
- [ ] Handles API errors gracefully (validation errors show which fields are wrong)

## Subtasks
- [ ] Implement interactive prompts using Bubbletea or a simpler prompt library
- [ ] Implement flag-based creation for non-interactive/scripted usage
- [ ] Implement mixed mode: use flag values as defaults, prompt for missing required fields
- [ ] Implement API call to `POST /api/v1/issues` via service layer
- [ ] Format and display created issue confirmation
- [ ] Implement `--dry-run` flag
- [ ] Handle API validation errors with helpful messages
- [ ] Write tests for input validation and flag parsing

## Notes
- Interactive mode detection: check if stdin is a TTY. If not (piped input), require all fields via flags
- For description in interactive mode, consider opening `$EDITOR` for multi-line input (like `git commit`)
- Bubbletea prompts provide a nicer UX than simple line-by-line prompts — consider using Bubbletea's text input component
- The `--dry-run` flag is useful for scripting and CI — shows the payload without sending it
