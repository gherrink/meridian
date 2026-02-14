# Task 5.11: Document Tracker Setup and API

> **Epic:** Meridian Tracker (Python)
> **Type:** Docs
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 5.5, 5.6
> **Status:** Pending

## Goal
Write documentation for the Meridian Tracker covering installation, configuration, API reference, and standalone usage.

## Background
The Tracker serves two audiences: developers using it standalone (without the Heart) as a simple issue tracker, and developers configuring it as a backend for the Heart. Documentation should cover both use cases.

## Acceptance Criteria
- [ ] Installation instructions (uv, Python version requirements)
- [ ] Configuration guide: storage selection (SQLite vs flat file), paths, port
- [ ] API reference: all endpoints with request/response examples
- [ ] Standalone usage guide: how to use the tracker without the Heart
- [ ] Heart integration guide: how to configure the Heart to use the Tracker
- [ ] Storage comparison: when to use SQLite vs flat file

## Subtasks
- [ ] Write installation section (uv install, run commands)
- [ ] Write configuration section (environment variables, storage options)
- [ ] Write API reference with curl examples for all endpoints
- [ ] Write standalone usage guide (getting started without the Heart)
- [ ] Write Heart integration guide (adapter-local configuration)
- [ ] Write storage comparison guide (SQLite: better for queries; flat file: better for version control)
- [ ] Add example `.env` file for quick setup

## Notes
- The Tracker should feel simple and approachable — a developer should go from zero to a running tracker in under 5 minutes
- Include curl examples that can be copy-pasted
- The Heart integration section should show the exact environment variables needed: `MERIDIAN_ADAPTER=local`, `TRACKER_URL=http://localhost:3002`
- Reference the auto-generated Swagger UI at `/docs` for interactive API exploration
