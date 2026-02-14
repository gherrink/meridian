# Task 3.10: Test with Claude Code

> **Epic:** MCP Server & Role Profiles
> **Type:** Feature
> **Priority:** High
> **Effort:** Medium (1-3 days)
> **Dependencies:** 3.8, 3.6
> **Status:** Pending

## Goal
Perform end-to-end validation by connecting Claude Code as a real MCP client to the Meridian MCP server. Verify that tool discovery, selection, and execution all work correctly in a real LLM interaction.

## Background
Automated tests verify that the MCP protocol works correctly, but real-world LLM usage can reveal issues that tests miss: confusing tool descriptions (LLM picks the wrong tool), unhelpful response formatting (LLM can't parse the result), or missing tools for common workflows. This task is hands-on testing with Claude Code to validate the user experience.

## Acceptance Criteria
- [ ] Claude Code successfully connects to Meridian MCP server via stdio
- [ ] Claude Code discovers and lists all available tools
- [ ] PM role filtering works: Claude Code sees only PM + shared tools when configured
- [ ] Dev role filtering works: Claude Code sees only Dev + shared tools when configured
- [ ] Claude Code can create an issue through natural conversation
- [ ] Claude Code can list and search issues
- [ ] Claude Code can update issue status
- [ ] Claude Code can view project overview
- [ ] Tool descriptions are clear enough that Claude Code selects the right tool for common prompts
- [ ] Response formatting is readable in Claude Code's output

## Subtasks
- [ ] Configure Claude Code MCP settings to connect to Meridian Heart
- [ ] Test tool discovery: ask Claude Code "what tools do you have?"
- [ ] Test PM workflow: "Create a new epic for user authentication"
- [ ] Test Dev workflow: "What should I work on next?" / "Mark issue #5 as done"
- [ ] Test shared tools: "Search for issues about authentication" / "Show me issue #3"
- [ ] Test role filtering: configure PM-only, verify Dev tools are hidden
- [ ] Document any tool description improvements needed (iterate on wording)
- [ ] Document any response format improvements needed
- [ ] Fix any issues found during testing
- [ ] Write down the final Claude Code MCP configuration for documentation

## Notes
- This is manual/exploratory testing — not automated. The goal is to catch UX issues that automated tests miss
- Take notes on which prompts work well and which confuse the LLM — this feeds into tool description improvements
- Test with a real GitHub backend (not just in-memory) to verify the full flow
- Common failure modes: LLM calls wrong tool, LLM provides wrong parameters, LLM can't interpret response
- Results from this testing should inform updates to tool descriptions in tasks 3.3, 3.4, 3.5
