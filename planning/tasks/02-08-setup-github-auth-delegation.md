# Task 2.8: Set Up GitHub Auth Delegation

> **Epic:** GitHub Adapter & REST API
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 2.7
> **Status:** Pending

## Goal
Implement authentication delegation for the GitHub adapter — passing user-provided credentials (PAT or OAuth token) to Octokit for API access.

## Background
Meridian delegates authentication to each backend adapter. For GitHub, this means accepting a Personal Access Token (PAT) or OAuth token via configuration and passing it to Octokit. The Heart itself does not manage user sessions or tokens — it trusts the configured credentials. This keeps auth simple for v1 while supporting more sophisticated flows in the future.

## Acceptance Criteria
- [ ] GitHub PAT loaded from config (`GITHUB_TOKEN`)
- [ ] Octokit instance created with the configured token
- [ ] Auth errors from GitHub API (401, 403) mapped to domain AuthorizationError
- [ ] Missing token produces clear startup error (not a runtime crash)
- [ ] Token is never logged or exposed in error messages
- [ ] Octokit instance is shared across all GitHub adapter calls (single authenticated client)

## Subtasks
- [ ] Create Octokit factory function that accepts token from config
- [ ] Implement auth error handling: GitHub 401 → AuthorizationError, GitHub 403 → AuthorizationError with scope hint
- [ ] Add token scrubbing to audit logger (ensure tokens are never in log output)
- [ ] Write tests for auth error mapping
- [ ] Document required GitHub token scopes (repo, read:org, etc.)

## Notes
- For v1, a single PAT per Heart instance is sufficient. Multi-user OAuth flows are deferred to v2+
- Required GitHub token scopes depend on operations: `repo` for private repos, `public_repo` for public repos, `read:org` for org access
- The Octokit factory function should be part of the adapter package, not the config manager
- Consider supporting `GITHUB_TOKEN` from GitHub Actions environment for CI integration test scenarios
