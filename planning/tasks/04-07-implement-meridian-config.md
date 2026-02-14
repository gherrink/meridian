# Task 4.7: Implement `meridian config`

> **Epic:** Meridian CLI (Go)
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 4.2
> **Status:** Pending

## Goal
Implement the `meridian config` command for managing CLI configuration — Heart URL, default project, output preferences, and other user settings.

## Background
The CLI needs persistent configuration for the Heart URL, default project, and user preferences. Viper handles the config file (`~/.meridian/config.yaml`), but users need a command to view and modify settings without manually editing YAML.

## Acceptance Criteria
- [ ] `meridian config` shows current configuration
- [ ] `meridian config set <key> <value>` sets a configuration value
- [ ] `meridian config get <key>` gets a specific value
- [ ] `meridian config init` creates a default config file with guided setup
- [ ] Configurable values: `heart_url`, `default_project`, `output_format`, `editor`
- [ ] Config stored in `~/.meridian/config.yaml`
- [ ] `config init` prompts for Heart URL and verifies connectivity

## Subtasks
- [ ] Implement `config` root command (show all config)
- [ ] Implement `config set` subcommand
- [ ] Implement `config get` subcommand
- [ ] Implement `config init` subcommand with interactive setup
- [ ] Add connectivity check in `config init` (ping Heart health endpoint)
- [ ] Create default config template
- [ ] Write tests for config read/write operations

## Notes
- `config init` is the first-run experience — make it friendly and helpful
- Connectivity check gives immediate feedback: "Connected to Heart at http://localhost:3000" or "Cannot reach Heart at ..."
- Consider `meridian config edit` to open config file in `$EDITOR`
- Config keys should use dot notation for nested values if needed
