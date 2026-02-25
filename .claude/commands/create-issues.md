---
description: Process one blueprint from a milestone plan into tracker issues with optional decomposition into an epic with sub-issues
argument-hint: "path to milestone plan file (e.g., .claude/work/milestone-my-feature.md)"
---

# Create Issues

Process ONE blueprint from a milestone plan file per execution. For each blueprint, decide whether to create it as a single issue or decompose it into an epic with child sub-issues. Uses codebase research to enrich issue descriptions with acceptance criteria, implementation hints, and file references. Run this command multiple times to process all blueprints.

## Core Principles

- **One blueprint per run** — Process exactly one pending blueprint, then stop. Run the command again to process the next.
- **Minimal interaction** — Happy path requires exactly 2 `AskUserQuestion` calls: one to decide the approach, one to approve the draft. Error recovery and edge cases get additional questions.
- **Research-enriched** — Every path (single or epic) gets codebase exploration. Descriptions include acceptance criteria, implementation hints, and key file references.
- **Tracker-first** — All issues are created via MCP tools. The plan file is updated to reflect what was created, including issue links.
- **One decision per question** — Keep `AskUserQuestion` calls focused with 2-4 short-labeled options.

---

## Phase 1: Load, Validate, and Decide

Read the milestone plan file, validate it, find the next pending blueprint, and ask the user how to process it — all in one phase with one question.

**Actions:**

1. Parse `$ARGUMENTS` as the path to the milestone plan file. If empty, use `AskUserQuestion` with a free-text "Other" option to ask for the file path.

2. Read the file and parse the YAML frontmatter. Validate:
   - `type` is `"milestone-plan"`
   - `version` is `2` or `3` (if version is `1`, inform the user the plan was created before milestone tracker integration and use `AskUserQuestion`: "Re-run /milestone-plan to upgrade" / "Cancel")
   - `milestone.id` is present and non-null (if null, see step 3)
   - `blueprints` array is non-empty
   - If `version` is `3`, `relations` array must be present (may be empty)

3. If `milestone.id` is null and the user wants to proceed:
   - Use `AskUserQuestion`: "Create milestone now" / "Cancel"
   - For "Create milestone now": load Meridian milestone tools via `ToolSearch` with query `+meridian milestone`, call `mcp__meridian__create_milestone` with the milestone fields from the plan, update the plan file with the returned `id` using `Edit`
   - On error: `AskUserQuestion` with "Retry" / "Cancel"

4. Identify the next pending blueprint — the first entry in `blueprints` where `tracker.status` is `"pending"`. If no pending blueprints remain, inform the user that all blueprints have been processed and stop.

5. Present the blueprint and ask for the processing decision in a single `AskUserQuestion`:

   First, display the context as text output:

   ```
   ## Milestone: <name> (ID: <id>)

   Progress: <N> of <total> blueprints processed

   ### Next blueprint: #<sequence>. <title>
   <description>

   Rationale: <rationale>
   ```

   Then immediately use `AskUserQuestion`:
   - **Single issue** — Create one tracker issue for this blueprint
   - **Decompose into epic** — Break into an epic with child sub-issues
   - **Skip** — Mark as skipped and stop

---

## Phase 2: Research

Research the codebase to enrich issue descriptions with concrete file references, patterns, and implementation context. This phase runs for ALL paths (single issue and epic).

**Actions:**

1. Determine exploration angles based on the blueprint description and the milestone scope:
   - **Single issue path**: 1 angle focused on the specific area this blueprint affects
   - **Epic path**: 1-2 angles covering the area and its integration boundaries

2. Launch `code-explorer` agents in parallel via `Task` tool (one per angle). Each explorer writes to `.claude/work/explore-blueprint-<sequence>-[angle].md`. Tell each explorer what the other angles are to avoid overlap. Do NOT use `run_in_background`.

3. If the plan file's `research` section references existing exploration files, consult those for additional context (do not re-explore already-covered ground).

4. Synthesize findings internally — do NOT present them to the user or ask a question. Findings are used to enrich descriptions in Phase 3. Proceed directly to Phase 3.

---

## Phase 3: Draft and Confirm

Draft enriched issue descriptions using research findings, present the draft, and get a single approval.

### Enriched Description Templates

**Single issue and epic sub-issue description template:**

```markdown
## Overview

[2-3 sentences from blueprint description, enriched with codebase context from Phase 2 findings]

## Acceptance Criteria

- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]

## Implementation Hints

- **Key files**: `path/to/file.ts`, `path/to/other.ts`
- **Patterns to follow**: [reference existing patterns found in research]
- **Constraints**: [architectural constraints or dependencies]
```

**Epic description template** (used for the epic parent issue only):

```markdown
## Overview

[2-3 sentences from blueprint description, enriched with codebase context]

## Scope

- [Area 1 this epic covers]
- [Area 2 this epic covers]

## Key Architecture Context

- **Relevant modules**: `path/to/module/`, `path/to/other/`
- **Patterns**: [architectural patterns discovered in research]
- **Boundaries**: [integration points and constraints]
```

### Single Issue Path

1. Draft the issue:
   - **Title**: the blueprint title
   - **Description**: use the single issue description template above
   - **Priority**: from the blueprint (or `normal` if null)
   - **Tags**: from the blueprint (or empty if null)
   - **Status**: `"backlog"`
   - **Metadata**: `{ "source": "milestone-plan", "blueprintSequence": <sequence> }`
   - **MilestoneId**: from the plan's `milestone.id`

2. Present the draft and use `AskUserQuestion`:
   - **Create** — Create this issue in the tracker
   - **Edit before creating** — Modify the draft first

3. For "Edit before creating" — use `AskUserQuestion` to ask what to change (title / description / priority). Apply the change, re-present, and loop back to step 2. This edit loop is the only case where additional questions are asked.

4. When the user selects "Create", proceed to Phase 4.

### Epic Path

1. Draft the epic issue:
   - **Title**: the blueprint title
   - **Description**: use the epic description template above
   - **Priority**: from the blueprint (or `normal` if null)
   - **Tags**: from the blueprint (or empty if null)

2. Draft 2-5 child sub-issues under the epic. Each child should:
   - Have a clear, specific title (imperative mood, describes deliverable)
   - Use the single issue description template (with acceptance criteria and implementation hints)
   - Be scoped to a single concern (one area of the codebase, one integration point, one test suite)
   - Be ordered by suggested implementation sequence
   - Include priority (inherited from blueprint or individually assessed)

3. Present the full draft:

   ```
   ## Epic: <title>
   <epic description>

   ### Sub-issues (in implementation order):

   1. <title>
      <description>
      Priority: <priority>

   2. <title>
      <description>
      Priority: <priority>
   ```

4. Use `AskUserQuestion`:
   - **Create** — Create the epic and all sub-issues
   - **Edit before creating** — Modify the draft first

5. For "Edit before creating" — use `AskUserQuestion` to select what to change:
   - Edit a sub-issue (then ask which one and what field)
   - Add a sub-issue
   - Remove a sub-issue
   - Edit the epic description

   After each change, re-present the full draft and loop back to step 4.

6. When the user selects "Create", proceed to Phase 4.

---

## Phase 4: Create and Link

Create issues in the tracker and establish "blocks" links between them.

### Load Tools

1. Load Meridian issue tools via `ToolSearch` with query `+meridian issue`.
2. Load Meridian link tools via `ToolSearch` with query `+meridian link`.

### Single Issue Creation

1. Call `mcp__meridian__create_issue` with:
   - `title`: the issue title
   - `description`: the enriched issue description
   - `milestoneId`: the milestone ID from the plan
   - `priority`: the issue priority
   - `tags`: the issue tags (if any)
   - `status`: `"backlog"`
   - `metadata`: `{ "source": "milestone-plan", "blueprintSequence": <sequence> }`

2. On success, extract the issue's `id` from the response. Store as `rootIssueId`.

3. **Error handling.** If the MCP call fails, use `AskUserQuestion`:
   - Retry
   - Skip this blueprint
   - Cancel

### Epic Creation

1. Create the epic first via `mcp__meridian__create_epic` with:
   - `milestoneId`: the milestone ID from the plan
   - `title`: the epic title
   - `description`: the enriched epic description

   Note: `create_epic` hardcodes `metadata: { type: 'epic' }` and does not accept custom metadata or status fields.

2. On success, extract the epic's `id` from the response. Store as `rootIssueId`.

3. Create each child sub-issue sequentially via `mcp__meridian__create_issue` with:
   - `title`: the sub-issue title
   - `description`: the enriched sub-issue description
   - `milestoneId`: the milestone ID from the plan
   - `parentId`: the epic's `id` from step 2
   - `priority`: the sub-issue priority
   - `tags`: the sub-issue tags (if any)
   - `status`: `"backlog"`
   - `metadata`: `{ "source": "milestone-plan", "blueprintSequence": <sequence> }`

4. Collect all returned child issue IDs in order as `childIds`.

5. **Error handling for epic creation.** If the `mcp__meridian__create_epic` call fails, use `AskUserQuestion`:
   - Retry
   - Skip this blueprint
   - Cancel

6. **Error handling for child creation.** If a `mcp__meridian__create_issue` call fails for a specific child, use `AskUserQuestion`:
   - Retry this child
   - Skip this child (continue with remaining children)
   - Cancel (keep the epic, stop creating children)

   If children are skipped, note them in the summary. The `childIds` array only includes successfully created children.

### Issue Linking

After all issues are created, establish links. Link failures are logged in the summary but do NOT halt execution.

**Intra-blueprint links (epics only):**

Chain sub-issues in implementation order — each sub-issue blocks the next one:
- `childIds[0]` blocks `childIds[1]`
- `childIds[1]` blocks `childIds[2]`
- etc.

For each consecutive pair, call `mcp__meridian__link_issues` with:
- `sourceIssueId`: the earlier child (the blocker)
- `targetIssueId`: the next child (the blocked one)
- `type`: `"blocks"`

**Cross-blueprint links — version 3 plans:**

After creating the current blueprint's issues, scan the plan's `relations` array for all relations where:
1. The current blueprint is the `source` OR `target`
2. The relation's `tracker.status` is `"pending"`
3. BOTH the source and target blueprints have `tracker.status: "created"` (both have issueIds)

For each eligible relation:
1. Resolve the `source` and `target` sequence numbers to `tracker.issueId` from the `blueprints` array
2. Call `mcp__meridian__link_issues` with `sourceIssueId`, `targetIssueId`, and `type` from the relation
3. On success: update the relation's tracker to `status: "created"`, `linkId: "<returned-uuid>"`
4. On failure: update the relation's tracker to `status: "failed"`, `note: "<error message>"`

**Deferred relations (version 3):** If a relation references a blueprint whose `tracker.status` is still `"pending"` (not yet processed), leave the relation as `"pending"` — it will be created when the other blueprint is processed in a subsequent `/create-issues` run.

**Skipped blueprint handling (version 3):** If a relation references a blueprint with `tracker.status: "skipped"`, set the relation to `status: "skipped"`, `note: "Blueprint #<N> was skipped"`.

**Cross-blueprint link — version 2 plans (legacy):**

Look up the previous blueprint's root issue to establish ordering across blueprints:
1. Scan the plan file's `blueprints` array for the last entry where `tracker.status` is `"created"` with a lower sequence number than the current blueprint.
2. If found, extract its `tracker.issueId` as `previousRootIssueId`.
3. Call `mcp__meridian__link_issues` with:
   - `sourceIssueId`: `previousRootIssueId` (the previous blueprint's root issue blocks the current one)
   - `targetIssueId`: `rootIssueId` (the current blueprint's root issue)
   - `type`: `"blocks"`
4. If no previous created blueprint exists (this is the first one), skip the cross-blueprint link.

Track all link results (successes and failures) for the summary and plan file update.

### Update Plan File

Update the plan file using `Edit` to set the blueprint's tracker block and (for v3) the top-level relations.

**Version 3 — Single issue:**
```yaml
tracker:
  status: "created"
  issueId: "<rootIssueId>"
  issueType: "single"
```

**Version 3 — Epic:**
```yaml
tracker:
  status: "created"
  issueId: "<rootIssueId>"
  issueType: "epic"
  childIds:
    - "<child-1-UUID>"
    - "<child-2-UUID>"
  links:
    chain: ["<child-1-UUID>", "<child-2-UUID>", "<child-3-UUID>"]
```

For v3 plans, cross-blueprint linking is tracked in the top-level `relations` array (not per-blueprint). Update each processed relation's tracker in the `relations` array:
```yaml
relations:
  - source: 1
    target: 2
    type: "blocks"
    tracker:
      status: "created"
      linkId: "<returned-uuid>"
  - source: 2
    target: 3
    type: "blocks"
    tracker:
      status: "pending"    # deferred — blueprint #3 not yet processed
```

The `links.chain` array lists child IDs in the order they were linked (same as `childIds`). Only include `chain` for epics with 2+ successfully created children.

**Version 2 — Single issue (legacy):**
```yaml
tracker:
  status: "created"
  issueId: "<rootIssueId>"
  issueType: "single"
  links:
    crossBlueprint: "<previousRootIssueId>"  # or null if first blueprint
```

**Version 2 — Epic (legacy):**
```yaml
tracker:
  status: "created"
  issueId: "<rootIssueId>"
  issueType: "epic"
  childIds:
    - "<child-1-UUID>"
    - "<child-2-UUID>"
  links:
    chain: ["<child-1-UUID>", "<child-2-UUID>", "<child-3-UUID>"]
    crossBlueprint: "<previousRootIssueId>"  # or null if first blueprint
```

For v2 plans, set `crossBlueprint` to `null` if there was no previous created blueprint or if the cross-blueprint link failed.

---

## Phase 5: Summary

Present results. Informational only — no question asked.

**Actions:**

1. Present the summary:

   ```
   ## Blueprint #<sequence> processed

   Milestone: <name> (<id>)
   Blueprint: <title>
   Type: <single issue | epic with N children>
   Issue ID: <rootIssueId>
   Status: backlog
   [Child IDs: <id>, <id>, ...] (only for epics)

   ### Links
   [Intra-blueprint: <child-1> blocks <child-2>, <child-2> blocks <child-3>] (only for epics)
   ```

   **Version 3 plans — add relations sections:**

   ```
   ### Relations processed
   - #1 blocks #2 — created (link: <linkId>)
   - #1 relates-to #3 — deferred (blueprint #3 not yet processed)

   ### Relations failed
   - #2 blocks #4 — failed: <error message>
   (only show this section if failures occurred)

   Deferred relations: <N> pending (waiting on unprocessed blueprints)
   ```

   **Version 2 plans — keep legacy format:**

   ```
   ### Links
   [Cross-blueprint: <previousRootIssueId> blocks <rootIssueId>] (or "None — first blueprint")
   [Link failures: <description of any failed links>] (only if failures occurred)
   ```

   **Common footer:**

   ```
   Remaining: <N> pending blueprints
   ```

2. If there are remaining pending blueprints, state as text (not a question):
   - "Run `/create-issues <plan-file-path>` to process the next blueprint."

3. If all blueprints are processed, state:
   - "All blueprints in this milestone plan have been processed."
