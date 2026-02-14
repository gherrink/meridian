# Task 6.12: Set Up GitHub Releases

> **Epic:** Integration, Docs & Polish
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Medium (1-3 days)
> **Dependencies:** 4.11, 1.9
> **Status:** Pending

## Goal
Set up automated release pipelines for all three components: Heart (Docker image), CLI (cross-platform binaries), and Tracker (Python package).

## Background
Each Meridian component has a different distribution format: the Heart runs as a Docker container or Node.js process, the CLI is distributed as pre-built binaries, and the Tracker is a Python package. GitHub Releases and GitHub Container Registry are the primary distribution channels.

## Acceptance Criteria
- [ ] Heart: Docker image built and pushed to GitHub Container Registry on tag
- [ ] CLI: Cross-platform binaries uploaded to GitHub Releases on tag
- [ ] Tracker: Python package built (sdist + wheel) and uploaded to GitHub Releases on tag
- [ ] Release notes auto-generated from commit messages or changelog
- [ ] Semantic versioning enforced (tag format: `v1.0.0`)
- [ ] Release workflow triggered by git tag push
- [ ] SHA256 checksums included for all artifacts

## Subtasks
- [ ] Create Dockerfile for Heart (multi-stage build, minimal image)
- [ ] Set up GitHub Actions workflow for Docker image build and push (GHCR)
- [ ] Configure goreleaser GitHub Release action for CLI binaries
- [ ] Set up Python package build workflow (uv build)
- [ ] Configure release trigger: on tag push matching `v*`
- [ ] Add release notes generation (from commits or changelog)
- [ ] Add checksum generation for all artifacts
- [ ] Test release pipeline with a test tag
- [ ] Document the release process for maintainers

## Notes
- Use multi-stage Docker build for Heart: build stage (node + pnpm + turbo) → runtime stage (node:22-slim)
- goreleaser handles CLI binary builds + GitHub Release upload in one step (configured in task 4.11)
- Consider using GitHub Actions reusable workflows for shared CI/CD logic
- PyPI publishing can be added later if there's demand — GitHub Releases is sufficient for v1
- Tag all components with the same version for v1 (monorepo versioning). Consider independent versioning for v2+ if components diverge
