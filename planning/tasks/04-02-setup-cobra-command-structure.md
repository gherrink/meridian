# Task 4.2: Set Up Cobra Command Structure

> **Epic:** Meridian CLI (Go)
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 4.1
> **Status:** Pending

## Goal
Set up the Cobra command structure with root command, subcommand tree, Viper config integration, and global flags. This is the CLI skeleton that all commands build on.

## Background
Cobra is the standard Go CLI framework, providing subcommands, flags, auto-generated help, and shell completions. Viper handles configuration from files, environment variables, and flags. The CLI follows a noun-verb pattern: `meridian issues list`, `meridian issues create`, `meridian overview`, `meridian config`.

## Acceptance Criteria
- [ ] Root command `meridian` with version, help, and global flags
- [ ] Subcommand tree: `overview`, `issues` (with `list`, `create`, `update`), `config`
- [ ] Global flags: `--heart-url` (Heart API base URL), `--output` (format), `--verbose`
- [ ] Viper integration: config file (`~/.meridian/config.yaml`), env vars, flags (flag > env > file)
- [ ] Auto-generated help text for all commands
- [ ] Shell completion support (bash, zsh, fish)
- [ ] `meridian --version` shows version info
- [ ] `meridian --help` shows command overview

## Subtasks
- [ ] Install Cobra and Viper dependencies
- [ ] Create root command with global flags and version info
- [ ] Create `overview` command stub
- [ ] Create `issues` command group with `list`, `create`, `update` subcommands (stubs)
- [ ] Create `config` command stub
- [ ] Set up Viper config loading (file path, env var prefix, flag binding)
- [ ] Create default config file structure (`~/.meridian/config.yaml`)
- [ ] Add shell completion generation command
- [ ] Wire API client service layer into command context
- [ ] Verify `meridian --help` shows clean command tree

## Notes
- Use Cobra's `cobra-cli` generator for initial scaffolding, then customize
- Viper config precedence: CLI flags > environment variables > config file > defaults
- Environment variable prefix: `MERIDIAN_` (e.g., `MERIDIAN_HEART_URL`)
- The API client should be created once in the root command's `PersistentPreRun` and available to all subcommands via Cobra's context
- Keep command files focused: one file per command or command group
