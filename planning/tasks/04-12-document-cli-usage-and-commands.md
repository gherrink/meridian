# Task 4.12: Document CLI Usage and Commands

> **Epic:** Meridian CLI (Go)
> **Type:** Docs
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 4.3, 4.4, 4.5, 4.6, 4.7
> **Status:** Pending

## Goal
Write documentation covering CLI installation, configuration, and a command reference with examples for every command.

## Background
Developers need clear documentation to install, configure, and use the Meridian CLI. This includes platform-specific installation instructions, first-run setup, and a command reference with practical examples.

## Acceptance Criteria
- [ ] Installation instructions for Linux, macOS, and Windows
- [ ] First-run configuration guide (`meridian config init`)
- [ ] Command reference for all commands with flags, description, and examples
- [ ] Common workflow examples (daily developer workflow, PM workflow)
- [ ] Output format documentation (table, JSON, plain)
- [ ] Troubleshooting section (connection issues, auth errors)

## Subtasks
- [ ] Write installation section (binary download, package manager if applicable)
- [ ] Write configuration section (config init, environment variables, config file)
- [ ] Write command reference: `meridian overview`
- [ ] Write command reference: `meridian issues list` (with filter examples)
- [ ] Write command reference: `meridian issues create` (interactive and flag modes)
- [ ] Write command reference: `meridian issues update`
- [ ] Write command reference: `meridian config`
- [ ] Write workflow examples: "Morning standup check", "Starting a new task", "Completing a task"
- [ ] Write troubleshooting guide

## Notes
- Include copy-pasteable commands for every example
- Show expected output for key commands (screenshot or text)
- The workflow examples are the most valuable part — they show how commands compose in real usage
- Consider auto-generating command reference from Cobra's built-in doc generation
