---
description: Interactively plan a milestone by researching the codebase, analyzing existing tracker state, and writing a milestone plan file with issue blueprints
argument-hint: "brief milestone goal (e.g., 'add JIRA adapter support')"
---

# Milestone Plan

Interactively plan a milestone with issue blueprints. Research the codebase, check existing tracker state, and collaboratively design the plan, then write it to a structured file for downstream consumption. Issue blueprints are high-level descriptions that outline scope and goals — their details are filled in later by other commands.

## Core Principles

- **Interactive** — Use `AskUserQuestion` at every decision point. Never proceed to a new phase without user confirmation.
- **High-level** — Plan milestones and issue blueprints only. Blueprints capture scope and goals; details are filled in later by other commands.
- **Research-backed** — Launch `code-explorer` agents via `Task` tool to understand relevant codebase areas, and `web-researcher` agents for external domain knowledge when the topic requires it.
- **Tracker-aware** — Check existing milestones and issues via MCP tools before proposing new ones to avoid duplication.
- **One decision per question** — Keep `AskUserQuestion` calls focused with 2-4 short-labeled options.

---

## Phase 1: Goal Discovery

Parse `$ARGUMENTS` as the starting point for the milestone goal. If empty, ask the user to describe their milestone goal before proceeding.

**Actions:**

1. If `$ARGUMENTS` is non-empty, present it back to the user as the understood goal. If empty, use `AskUserQuestion` to ask the user to describe their milestone goal (via the "Other" free-text option).

2. Ask clarifying questions via `AskUserQuestion` — one question per call:

   **Scope** — Which areas of the codebase does this milestone affect?
   - Options: Heart (packages/*) / CLI (cli/) / Tracker (tracker/) / Multiple areas
   - Use `multiSelect: true`

   **Timeline** — What's the timeline for this milestone?
   - Options: No deadline / Rough target / Hard deadline

   **Dependencies** — How does this relate to existing work?
   - Options: Standalone / Builds on existing work / Not sure yet

3. Summarize the understood goal, scope, timeline, and dependencies back to the user before moving on.

4. Generate a preliminary session slug from the understood goal for use in research file naming (Phases 2-3):
   - Take the first 3-4 significant words from the goal summary
   - Lowercase, replace non-alphanumeric characters with hyphens, collapse consecutive hyphens, trim leading/trailing hyphens, truncate to 30 characters
   - Example: goal "add JIRA adapter support" → slug `add-jira-adapter-support`
   - This slug is only used for research file naming; the final milestone file slug is determined in Phase 7

---

## Phase 2: Codebase Research (conditional)

Research relevant codebase areas to inform the milestone plan. Skip this phase if the user indicates the goal is well-understood and doesn't require exploration.

**Actions:**

1. Determine 1-3 exploration angles based on the scope from Phase 1. Each angle must be completely different — no overlapping concerns. Examples:
   - Current architecture in the affected area
   - Integration boundaries and extension points
   - Similar prior art or patterns already in the codebase

2. Launch `code-explorer` agents in parallel via `Task` tool (one per angle). Each explorer writes to `.claude/work/explore-<session-slug>-[angle].md` (where `<session-slug>` is the preliminary slug from Phase 1 step 4). When launching multiple explorers, tell each one what the OTHER angles are so they avoid overlap. Do NOT use `run_in_background`.

3. Synthesize the agent return summaries into a brief overview for the user — key findings, relevant patterns, potential challenges.

4. Use `AskUserQuestion`:
   - Proceed to next phase
   - Explore more (specify area)
   - Skip to planning

---

## Phase 3: External Research (conditional)

Research external domain knowledge when the milestone involves technologies, APIs, protocols, or approaches that benefit from web research. Skip this phase when the milestone is purely internal work (refactoring, adding tests, reorganizing existing code).

**Run this phase if ANY indicator is present in the goal or Phase 1 answers:**
- External API or service names (e.g., "GitHub API", "JIRA", "Octokit", "Linear")
- Library or framework integration ("using X", "integrate with Y", "via Z")
- Protocol or transport keywords ("REST", "GraphQL", "WebSocket", "OAuth", "MCP")
- Explicit unknowns ("evaluate", "choose between", "best approach for")

**Skip this phase if:**
- The milestone follows an existing codebase pattern (e.g., new adapter mirroring an existing one)
- Purely internal work (refactoring, test coverage, domain logic)
- No external dependencies or unknowns in the goal

**Actions:**

1. Determine 1-3 research angles based on the milestone goal. Each angle should target a distinct area of external knowledge. Examples:
   - **Domain research** — how similar features or systems are built elsewhere, industry patterns
   - **Technology research** — relevant libraries, tools, APIs, or protocols and their trade-offs
   - **Risk research** — common pitfalls, failure modes, edge cases, or compatibility concerns

2. Launch `web-researcher` agents in parallel via `Task` tool (one per angle, use `model: "haiku"`). Each researcher receives a specific research brief and writes to `.claude/work/research-<session-slug>-[topic].md` (where `<session-slug>` is the preliminary slug from Phase 1 step 4). Do NOT use `run_in_background`.

3. Synthesize the agent return summaries into key takeaways for the user — relevant technologies, recommended approaches, risks to consider.

4. Use `AskUserQuestion`:
   - Proceed to next phase
   - Research more (specify topic)
   - Discard research and skip ahead

---

## Phase 4: Existing State Analysis

Check the tracker for existing milestones and issues to avoid duplication and identify opportunities to extend existing work.

**Actions:**

1. Load Meridian milestone tools via `ToolSearch` with query `+meridian milestone`.

2. Call `mcp__meridian__list_pm_milestones` to retrieve existing milestones.

3. If related milestones are found:
   - Load search tools via `ToolSearch` with query `+meridian search`
   - Call `mcp__meridian__search_issues` to check for overlapping issues
   - Present the findings to the user

4. If no related milestones are found, report that this is a fresh area.

5. Use `AskUserQuestion`:
   - Plan new milestone
   - Extend existing milestone (only show if relevant milestones were found)
   - Adjust goal

6. **If the user selects "Extend existing milestone":**
   - If multiple relevant milestones exist, use `AskUserQuestion` to let the user pick which one (list milestone names as options).
   - Call `mcp__meridian__milestone_overview` with the selected milestone's `id` to retrieve its full details and current issue counts.
   - Present the milestone details: name, description, due date, status, total issues, and state breakdown (open/in_progress/done).
   - Store the selected milestone as a conceptual `selectedMilestone = { id, name, description, status, dueDate, metadata }` to carry forward through Phases 5 and 7.
   - Use `AskUserQuestion`:
     - Proceed to plan design with this milestone
     - Pick a different milestone
     - Switch to new milestone instead

7. **Error handling:** If MCP tools fail to load or calls error out, use `AskUserQuestion`:
   - Retry
   - Skip tracker check
   - Abort

---

## Phase 5: Plan Design

Draft the milestone and its issue blueprints based on research findings and user input.

**Actions:**

1. Draft the milestone:

   **If extending an existing milestone** (i.e., `selectedMilestone` was set in Phase 4 step 6):
   - Pre-populate name, description, due date, and metadata from `selectedMilestone`.
   - Do NOT change the milestone name — it already exists in the tracker.
   - Present the current description and use `AskUserQuestion`:
     - Keep current description
     - Update description (free-text via "Other")

   **If creating a new milestone:**
   - **Name** — concise, descriptive title
   - **Description** — 2-4 sentences explaining the milestone's scope and goals
   - **Due date** — based on Phase 1 timeline discussion (ISO 8601 or null)
   - **Metadata** — any relevant key-value pairs

   **Name conflict check** (new milestones only, skip if extending):
   - Compare the drafted milestone name against the existing milestones retrieved in Phase 4.
   - If an exact name match exists, warn the user: "A milestone named '<name>' already exists (ID: <id>). Creating another will fail with a conflict error." Use `AskUserQuestion`:
     - Extend that milestone instead (set `selectedMilestone` from the match and restart step 1)
     - Choose a different name (free-text via "Other")
   - If a close match exists (case-insensitive or substring overlap), note it: "A similarly-named milestone '<existing-name>' exists." Use `AskUserQuestion`:
     - Extend that milestone instead
     - Keep my name
     - Choose a different name (free-text via "Other")
   - If Phase 4 was skipped (tracker check failed), note that name uniqueness could not be verified.

2. Draft issue blueprints based on research findings. The number of blueprints is determined by the analysis — there is no fixed range. Each blueprint is a high-level issue that outlines a distinct area of work; details will be filled in later. For each blueprint, include:
   - **Title** — short, descriptive name
   - **Description** — 2-4 sentences explaining scope, goals, and what this area of work delivers. This description is critical — downstream agents and commands use it to decompose blueprints into detailed tasks.
   - **Rationale** — why this is a distinct blueprint (not merged with another)

3. Order blueprints by suggested implementation sequence.

4. Generate default relations: for each consecutive pair of blueprints (N and N+1), create a `blocks` relation where blueprint N blocks blueprint N+1. This provides an editable starting point that preserves sequential ordering. Store as a `relations` list with entries `{ source: <sequence>, target: <sequence>, type: "blocks" }`.

5. Present the complete plan in a structured format:

   ```
   ## Milestone: [Name]
   [Description]
   Due: [date or "No deadline"]

   ### 1. [Title]
   [Description]
   Rationale: [Why this is a separate blueprint]

   ### 2. [Title]
   ...

   ## Relations

   - #1 "[Title A]" **blocks** #2 "[Title B]"
   - #2 "[Title B]" **blocks** #3 "[Title C]"
   ```

   If there are no relations (single blueprint or all cleared), show: `No relations defined.`

6. Use `AskUserQuestion`:
   - Looks good
   - Adjust milestone details
   - Adjust blueprints
   - Start over

---

## Phase 6: Refinement (loop)

Iterate on the plan until the user is satisfied.

**Actions:**

1. Use `AskUserQuestion` in a loop:
   - Add a blueprint
   - Remove a blueprint
   - Edit a blueprint
   - Edit relations
   - Change milestone details
   - Plan is final

2. For "Add a blueprint" — ask for title and description, then insert it into the plan at the appropriate position.

3. For "Remove a blueprint" — ask which blueprint to remove (list them as options), then remove it. **Cascade:** also remove all relations where the removed blueprint is the `source` or `target`. Renumber remaining blueprints and update all sequence references in the surviving relations.

4. For "Edit a blueprint" — ask which blueprint to edit (list them as options), then ask what to change (title / description / position in sequence). **If position changes:** renumber blueprints and update all sequence references in relations to match. Note to the user: "Blueprint sequence numbers changed — review relations."

5. For "Edit relations" — present the current relations list, then use `AskUserQuestion` in a sub-loop:
   - **Add a relation** — ask for: source blueprint (list as options), target blueprint (list as options), type (`blocks` / `relates-to` / `duplicates`). Validate: no self-relations (source ≠ target), no duplicate relations (same source, target, and type). If invalid, explain why and re-ask.
   - **Remove a relation** — list current relations as options (formatted as `#<source> <type> #<target>`), let the user pick one to remove.
   - **Reset to defaults** — regenerate sequential `blocks` chain from the current blueprint ordering (N blocks N+1 for each consecutive pair). Confirm before applying.
   - **Clear all** — remove all relations. Confirm before applying.
   - **Done** — return to the main refinement loop.

   After each sub-action, re-present the updated relations list and loop back to the sub-menu.

6. For "Change milestone details" — ask what to change (name / description / due date / metadata).

7. After each change, re-present the updated plan (including the Relations section) and loop back to the `AskUserQuestion`.

8. When the user selects "Plan is final", present the complete plan one last time and use `AskUserQuestion` as a final confirmation gate:
   - Write plan to file
   - More changes
   - Cancel

---

## Phase 7: Write Plan File and Create Milestone

Write the finalized milestone plan to a structured file in `.claude/work/` and create the milestone in the tracker (if not extending an existing one). This file serves as the handoff artifact for the `/create-issues` command.

**Note:** MCP tools loaded via `ToolSearch` in earlier phases remain available. Do not call `ToolSearch` again for tool queries already executed (e.g., `+meridian milestone` from Phase 4).

**Actions:**

1. Generate the file slug from the milestone name:
   - Lowercase, replace non-alphanumeric characters with hyphens, collapse consecutive hyphens, trim leading/trailing hyphens, truncate to 50 characters
   - File path: `.claude/work/milestone-<slug>.md`

2. **Check for existing plan file.** Before proceeding, check if `.claude/work/milestone-<slug>.md` already exists (use `Read` tool; if it returns content, the file exists). If it does, use `AskUserQuestion`:
   - Overwrite existing plan
   - Choose different name (free-text via "Other" — re-derive slug and re-check)
   - Cancel

   Loop until the path is available or the user confirms overwrite.

3. Collect research file references. Gather the paths of any files produced during Phases 2-3:
   - `.claude/work/explore-<session-slug>-*.md` files from Phase 2 codebase research
   - `.claude/work/research-<session-slug>-*.md` files from Phase 3 external research
   - Only include files that actually exist (some phases may have been skipped)

4. Write the milestone plan file using the `Write` tool with the following structure:

   ````markdown
   ---
   type: milestone-plan
   version: 3
   createdAt: "<ISO 8601 timestamp>"
   milestone:
     id: <selectedMilestone.id if extending, otherwise null>
     name: "<milestone name>"
     description: "<milestone description>"
     status: "open"
     dueDate: <ISO 8601 string or null>
     metadata:
       <key>: <value>
   blueprints:
     - sequence: 1
       title: "<blueprint title>"
       description: "<blueprint description>"
       rationale: "<why this is a distinct blueprint>"
       priority: <priority or null>
       tags: <list or null>
       tracker:
         status: "pending"
     - sequence: 2
       title: "<blueprint title>"
       description: "<blueprint description>"
       rationale: "<why this is a distinct blueprint>"
       priority: <priority or null>
       tags: <list or null>
       tracker:
         status: "pending"
   relations:
     - source: 1
       target: 2
       type: "blocks"
       tracker:
         status: "pending"
     - source: 2
       target: 3
       type: "blocks"
       tracker:
         status: "pending"
   research:
     - ".claude/work/explore-<session-slug>-architecture.md"
     - ".claude/work/research-<session-slug>-jira-api.md"
   ---

   # Milestone: <name>

   <milestone description>

   **Due:** <date or "No deadline">

   ---

   ## Blueprints

   ### 1. <title>

   <description>

   **Rationale:** <why this is a distinct blueprint>

   ### 2. <title>

   <description>

   **Rationale:** <why this is a distinct blueprint>

   ---

   ## Relations

   - #1 "<title A>" **blocks** #2 "<title B>"
   - #2 "<title B>" **blocks** #3 "<title C>"

   ---

   ## Research References

   - `.claude/work/explore-<session-slug>-architecture.md` — <brief label from filename>
   - `.claude/work/research-<session-slug>-jira-api.md` — <brief label from filename>
   ````

   Write `relations: []` if no relations exist. Show `No relations defined.` in the markdown Relations section in that case.

5. **Error handling for file write:** If the `Write` tool fails, use `AskUserQuestion`:
   - Retry writing the file
   - Try a different file name
   - Cancel

6. **Create or skip milestone in tracker.**

   **If extending an existing milestone** (i.e., `selectedMilestone` was set in Phase 4):
   - Skip `create_milestone` — the milestone already exists in the tracker.
   - The plan file was already written with the existing milestone's `id`.

   **If creating a new milestone:**
   - Load Meridian milestone tools via `ToolSearch` with query `+meridian milestone` if not already loaded from Phase 4.
   - Call `mcp__meridian__create_milestone` with:
     - `name`: the milestone name from the plan
     - `description`: the milestone description from the plan
     - `status`: `"open"`
     - `dueDate`: the due date from the plan (ISO 8601 string or null)
     - `metadata`: the metadata from the plan

7. **Update plan file with milestone ID** (new milestone only). On success, the tool returns a JSON object containing an `id` field. Update the plan file using the `Edit` tool to replace `id: null` under the `milestone:` section with `id: "<returned-UUID>"`.

8. **Error handling for milestone creation** (new milestone only). If `ToolSearch` fails to load the tool, or if the `mcp__meridian__create_milestone` call returns an error, use `AskUserQuestion`:
   - Retry creating the milestone
   - Skip milestone creation (leave `id: null` in the plan file)
   - Cancel

   If the user chooses "Skip", the plan file retains `id: null`. The final summary notes that the milestone was not created and `/create-issues` will prompt for milestone creation before processing blueprints.

9. After the file is written and the milestone creation step is resolved, present a final summary:
   - File path written (e.g., `.claude/work/milestone-<slug>.md`)
   - Milestone name, tracker ID (or "not created" if skipped, or "existing" if extending), and blueprint count
   - List of blueprint titles in implementation sequence order
   - Research files referenced (if any)
   - Suggested next step: use `/create-issues .claude/work/milestone-<slug>.md` to process blueprints into tracker issues one at a time
