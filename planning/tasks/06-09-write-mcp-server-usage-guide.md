# Task 6.9: Write MCP Server Usage Guide

> **Epic:** Integration, Docs & Polish
> **Type:** Docs
> **Priority:** Medium
> **Effort:** Small (< 1 day)
> **Dependencies:** 3.11
> **Status:** Pending

## Goal
Write a polished, user-facing MCP server usage guide that consolidates and expands on the initial documentation from task 3.11.

## Background
This is the definitive guide for connecting LLM clients to Meridian. It should cover Claude Code setup, role configuration, transport options, and troubleshooting — with enough detail for someone unfamiliar with MCP to get started.

## Acceptance Criteria
- [ ] Step-by-step Claude Code connection guide (stdio and HTTP)
- [ ] Role profile configuration with examples (PM, Dev, custom)
- [ ] Complete tool reference with descriptions and example interactions
- [ ] Transport comparison guide (stdio vs HTTP — when to use each)
- [ ] Troubleshooting guide for common MCP connection issues
- [ ] Example LLM conversation showing Meridian tools in action

## Subtasks
- [ ] Review and expand task 3.11 documentation
- [ ] Write detailed Claude Code configuration guide
- [ ] Write role profile examples with real configuration snippets
- [ ] Create complete tool reference table
- [ ] Write example conversation transcript (LLM using Meridian tools)
- [ ] Write troubleshooting section (connection failures, tool not found, auth errors)
- [ ] Add FAQ section for common questions

## Notes
- Build on the documentation from task 3.11 — don't start from scratch
- The example conversation transcript is valuable for showing what the experience looks like before someone sets it up
- Include screenshots if helpful (Claude Code showing tool list, tool execution)
- Place in `docs/mcp-guide.md` in the repo
