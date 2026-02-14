# Task 6.4: Adapter Switching Verification

> **Epic:** Integration, Docs & Polish
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 2.9, 5.7
> **Status:** Pending

## Goal
Verify that switching the Heart between GitHub and Meridian Tracker adapters requires only a configuration change — no code modifications, no restarts of consumers.

## Background
The adapter abstraction is a core architectural promise: change `MERIDIAN_ADAPTER=github` to `MERIDIAN_ADAPTER=local` and everything works. This task explicitly tests that promise with a structured verification process.

## Acceptance Criteria
- [ ] Heart starts with `MERIDIAN_ADAPTER=github` — all operations work
- [ ] Heart restarts with `MERIDIAN_ADAPTER=local` — all operations work
- [ ] Same REST API requests produce valid responses with both adapters
- [ ] Same MCP tool calls produce valid responses with both adapters
- [ ] No code changes required between adapter switches
- [ ] Startup logs clearly indicate which adapter is active
- [ ] Invalid adapter name produces clear error message at startup

## Subtasks
- [ ] Write a test script that starts Heart with GitHub adapter and runs smoke tests
- [ ] Restart Heart with Tracker adapter and run same smoke tests
- [ ] Verify REST API responses have the same shape (same JSON structure)
- [ ] Verify MCP tool responses have the same structure
- [ ] Test invalid `MERIDIAN_ADAPTER` value (clear error, not crash)
- [ ] Document the adapter switching process

## Notes
- This is partly a manual verification task and partly an automated test
- The "same shape" assertion is key — consumers shouldn't need to know which adapter is active
- Consider a comparison test that runs the same operations against both adapters and diffs the response structures (ignoring data values)
- This validates success metric #3 and is a great demo for project presentations
