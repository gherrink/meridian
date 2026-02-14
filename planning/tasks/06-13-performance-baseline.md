# Task 6.13: Performance Baseline

> **Epic:** Integration, Docs & Polish
> **Type:** Feature
> **Priority:** Low
> **Effort:** Small (< 1 day)
> **Dependencies:** 2.9
> **Status:** Pending

## Goal
Establish performance baselines for API response times and MCP tool execution under typical load. These baselines serve as benchmarks for future optimization decisions.

## Background
Performance is not a primary v1 concern (correctness and quality are), but establishing baselines now means future changes can be measured against a known starting point. If response times are already fast (sub-100ms for most operations), no optimization is needed. If something is unexpectedly slow, it's better to know now.

## Acceptance Criteria
- [ ] REST API response times measured for key endpoints (create, list, get, update)
- [ ] MCP tool execution times measured for key tools
- [ ] Measurements taken with both in-memory adapter (baseline) and GitHub adapter (real-world)
- [ ] Results documented with: p50, p95, p99 latencies
- [ ] No regressions from expected ranges (REST: < 100ms in-memory, < 500ms GitHub)
- [ ] Baseline document stored in repo for future comparison

## Subtasks
- [ ] Set up simple benchmarking script (Node.js or shell)
- [ ] Measure REST API endpoints with in-memory adapter
- [ ] Measure REST API endpoints with GitHub adapter
- [ ] Measure MCP tool calls with in-memory adapter
- [ ] Measure MCP tool calls with GitHub adapter
- [ ] Record p50, p95, p99 latencies
- [ ] Document results in a baseline file
- [ ] Identify any unexpectedly slow operations (investigate if found)

## Notes
- This is NOT a load testing task — just measure response times under typical single-user load
- A simple script making 100 sequential requests per endpoint is sufficient
- GitHub API latency will dominate the real-world measurements — that's expected and not something to optimize
- Consider using `autocannon` (Node.js) or `hey` (Go) for quick HTTP benchmarking
- Store results in `docs/performance-baseline.md` for future reference
- If everything is under 500ms with a real GitHub backend, performance is fine for v1
