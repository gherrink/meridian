# Task 4.11: Cross-Compile Binaries

> **Epic:** Meridian CLI (Go)
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 4.2
> **Status:** Pending

## Goal
Set up goreleaser for cross-compiling the CLI binary for all major platforms and architectures, and configure release packaging.

## Background
The Go CLI should be distributed as pre-built binaries for Linux, macOS, and Windows across amd64 and arm64 architectures. goreleaser automates cross-compilation, packaging (tar.gz, zip), checksum generation, and GitHub Releases upload.

## Acceptance Criteria
- [ ] goreleaser configured for the CLI
- [ ] Builds for: linux/amd64, linux/arm64, darwin/amd64, darwin/arm64, windows/amd64
- [ ] Binary named `meridian` (or `meridian.exe` on Windows)
- [ ] Version info embedded in binary at build time (git tag, commit, date)
- [ ] `meridian --version` shows embedded version info
- [ ] Packages: tar.gz for Linux/macOS, zip for Windows
- [ ] SHA256 checksums generated
- [ ] `goreleaser build --snapshot` works locally for testing

## Subtasks
- [ ] Install goreleaser
- [ ] Create `.goreleaser.yaml` configuration
- [ ] Configure build targets (GOOS/GOARCH matrix)
- [ ] Set up ldflags for version embedding (`-X main.version=...`)
- [ ] Configure archive formats (tar.gz, zip)
- [ ] Configure checksum generation
- [ ] Test local build with `goreleaser build --snapshot --clean`
- [ ] Verify binaries run on at least one non-native platform (via Docker or CI)

## Notes
- goreleaser can also handle GitHub Releases upload (used in task 6.12), but this task focuses on the build configuration
- Version embedding via ldflags: `-X main.version={{.Version}} -X main.commit={{.Commit}} -X main.date={{.Date}}`
- Consider adding a Homebrew tap formula for macOS users (can be deferred to post-v1)
- CGO should be disabled (`CGO_ENABLED=0`) for true cross-compilation without C dependencies
