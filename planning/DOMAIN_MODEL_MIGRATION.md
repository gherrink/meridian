# Domain Model Migration

Migration guide from the current implementation to the target model defined in [DOMAIN_MODEL.md](./DOMAIN_MODEL.md).

## 1. Overview

Five conceptual shifts move the current implementation to the target model:

1. **Epic becomes an Issue.** The separate `Epic` entity (its own schema, repository, use cases) is removed. Epics are modeled as root-level issues with children via `parentId`. The MCP server's `create_epic` tool already follows this pattern — it calls `createIssue` with `metadata.type = "epic"`.

2. **Issue gains hierarchy.** A new `parentId` field on Issue enables a 3-level parent/child tree (Epic → Story → Subtask). Depth is enforced in the use-case layer, not the schema.

3. **Milestone becomes optional.** `Issue.milestoneId` changes from required to nullable. Issues can exist without belonging to any milestone. Milestone gains `status` and `dueDate` fields.

4. **Status splits into State + Status.** The current `status` field (enum: `open`, `in_progress`, `closed`) is renamed to `state` and its values change to `open | in_progress | done`. A new `status` field is added as a project-configurable workflow step (default: `backlog`, `ready`, `in_progress`, `in_review`, `done`). Each status maps to exactly one state. See DOMAIN_MODEL.md section 5 for full details.

5. **Configurable fields (future).** Priority and Status will become project-configurable lists. For now, Status uses a fixed global default set and Priority retains the existing fixed enum. The path forward is documented in DOMAIN_MODEL.md section 5.

## 2. Entity Changes

### Issue

| Field | Before | After | Notes |
|---|---|---|---|
| `parentId` | — | `IssueId \| null`, default `null` | New field. Enables hierarchy. |
| `milestoneId` | `MilestoneId` (required) | `MilestoneId \| null`, default `null` | Was required, becomes optional. |
| `status` | `Status` enum (`open`, `in_progress`, `closed`) | Renamed to `state`: `State` enum (`open`, `in_progress`, `done`) | Field renamed; `closed` → `done`. |
| `status` (new) | — | `Status` string, default `"backlog"` | New field. Project-configurable workflow step. |

All other fields (`id`, `title`, `description`, `priority`, `assigneeIds`, `tags`, `dueDate`, `metadata`, `createdAt`, `updatedAt`) remain unchanged.

**Input schemas:**
- `CreateIssueInputSchema`: add optional `parentId`; change `milestoneId` from required to optional with default `null`; rename `status` to `state` with default `"open"`; add `status` with default `"backlog"`
- `UpdateIssueInputSchema`: add optional `parentId`; rename `status` to `state`; add optional `status`
- `IssueFilterSchema`: add optional `parentId` filter; rename `status` to `state`; add optional `status` filter

### Milestone

| Field | Before | After | Notes |
|---|---|---|---|
| `status` | — | `"open" \| "closed"`, default `"open"` | New field. |
| `dueDate` | — | `Date \| null`, default `null` | New field. |

All other fields (`id`, `name`, `description`, `metadata`, `createdAt`, `updatedAt`) remain unchanged.

**Input schemas:**
- `CreateMilestoneInputSchema`: add optional `status`, optional `dueDate`
- `UpdateMilestoneInputSchema`: add optional `status`, optional `dueDate`

### Epic (removed)

The entire Epic entity is deleted. All files, types, repository interfaces, use cases, and tests are removed.

**What replaces it:** An issue with `parentId = null` and `metadata.type = "epic"` serves the same role. The `create_epic` MCP tool already implements this pattern.

## 3. Files to Modify

### Delete (Epic removal)

| File | What it contains |
|---|---|
| `packages/core/src/model/epic.ts` | `EpicSchema`, `CreateEpicInputSchema`, `UpdateEpicInputSchema` |
| `packages/core/src/ports/epic-repository.ts` | `IEpicRepository` interface |
| `packages/core/src/adapters/in-memory-epic-repository.ts` | `InMemoryEpicRepository` class |
| `packages/core/src/use-cases/create-epic.ts` | `CreateEpicUseCase` |
| `packages/core/src/use-cases/get-epic.ts` | `GetEpicUseCase` |
| `packages/core/src/use-cases/update-epic.ts` | `UpdateEpicUseCase` |
| `packages/core/src/use-cases/delete-epic.ts` | `DeleteEpicUseCase` |
| `packages/core/src/use-cases/list-epics.ts` | `ListEpicsUseCase` |
| `packages/core/tests/model/epic.test.ts` | Epic schema tests |
| `packages/core/tests/adapters/in-memory-epic-repository.test.ts` | Epic repository tests |
| `packages/core/tests/use-cases/create-epic.test.ts` | CreateEpic use case tests |
| `packages/core/tests/use-cases/get-epic.test.ts` | GetEpic use case tests |
| `packages/core/tests/use-cases/update-epic.test.ts` | UpdateEpic use case tests |
| `packages/core/tests/use-cases/delete-epic.test.ts` | DeleteEpic use case tests |
| `packages/core/tests/use-cases/list-epics.test.ts` | ListEpics use case tests |

### Modify (Issue hierarchy + optional milestone)

| File | Change |
|---|---|
| `packages/core/src/model/value-objects.ts` | Remove `EpicIdSchema` and `EpicId` type |
| `packages/core/src/model/status.ts` | Rename to `state.ts`. Rename `StatusSchema` → `StateSchema`, `Status` → `State`. Change values from `['open', 'in_progress', 'closed']` to `['open', 'in_progress', 'done']`. Rename exports `STATUS_VALUES` → `STATE_VALUES`. |
| `packages/core/src/model/issue.ts` | Rename `status` field to `state` (using `StateSchema`); add new `status` field (string, validated against configured set, default `"backlog"`); add `parentId: IssueIdSchema.nullable().default(null)`; change `milestoneId` to `.nullable().default(null)`. Apply same to all input/filter schemas. |
| `packages/core/src/model/milestone.ts` | Add `status: z.enum(["open", "closed"]).default("open")` and `dueDate: z.date().nullable().default(null)` to `MilestoneSchema`, `CreateMilestoneInputSchema`, `UpdateMilestoneInputSchema` |
| `packages/core/src/model/index.ts` | Remove Epic re-exports |
| `packages/core/src/ports/index.ts` | Remove `IEpicRepository` re-export |
| `packages/core/src/adapters/index.ts` | Remove `InMemoryEpicRepository` re-export |
| `packages/core/src/use-cases/index.ts` | Remove all Epic use case re-exports |
| `packages/core/tests/helpers/fixtures.ts` | Remove `TEST_EPIC_ID` and `createEpicFixture()` |

### Modify (MCP server)

| File | Change |
|---|---|
| `packages/mcp-server/src/tools/pm/create-epic.ts` | Update to pass `parentId` instead of storing hierarchy in metadata. Accept optional `parentId` param for nesting under another epic. |
| `packages/mcp-server/src/tools/pm/index.ts` | No structural change — `create_epic` registration remains |
| `packages/mcp-server/src/types.ts` | No change needed — already depends on `CreateIssueUseCase`, not Epic use cases |
| `packages/mcp-server/tests/pm-tools.test.ts` | Update `create_epic` test assertions for `parentId` instead of metadata-based children |

### Modify (GitHub adapter)

| File | Change |
|---|---|
| `packages/adapter-github/src/mappers/issue-mapper.ts` | In `toDomain`: extract `parentId` from body HTML comment `<!-- meridian:parent=ISSUE_URL -->`; make `milestoneId` nullable; rename `status` extraction to `state`; add `status` extraction from `status:{name}` labels. In `toCreateParams`/`toUpdateParams`: embed parent comment in body; emit `status:{name}` label for status. |
| `packages/adapter-github/src/mappers/label-mapper.ts` | Rename `extractStatus` → `extractState` and `toStatusLabels` → `toStateLabels`; update `STATUS_PREFIX` usage to distinguish state-related labels from status labels; add `extractStatus` for `status:{name}` labels. |
| `packages/adapter-github/src/mappers/milestone-mapper.ts` | In `toDomain`: map `github_state` metadata to new `status` field; map `due_on` to `dueDate`. In `toCreateParams`/`toUpdateParams`: handle `status` ↔ `state` and `dueDate` ↔ `due_on`. |

### New

| File | Purpose |
|---|---|
| `packages/core/src/model/state.ts` | `StateSchema` enum (`open`, `in_progress`, `done`), `State` type, `STATE_VALUES` — renamed from `status.ts` |
| `packages/core/src/model/status.ts` | New file. `StatusSchema` (string validated against configured set), `Status` type, default status configuration with state mappings |
| `packages/core/src/use-cases/reparent-issue.ts` | Validates depth constraints and circular references when setting `parentId` |

## 4. Adapter Impact

### GitHub Adapter

**Hierarchy (parentId):**
- GitHub Issues have no native parent/child relationship
- Encode parent link as an HTML comment in the issue body: `<!-- meridian:parent={owner}/{repo}#{number} -->`
- On read (`toDomain`): parse the comment to extract `parentId`; generate deterministic UUID from the referenced issue number
- On create/update: inject or update the comment in the body
- `childCount` is computed by querying issues whose body contains a parent comment pointing to this issue

**State/Status split:**
- Current `extractStatus` derives a 3-value enum from `state` + `status:in-progress` label
- After migration: `extractState` derives `open | in_progress | done` from the same signals (renamed, `closed` → `done`)
- New `extractStatus` reads `status:{name}` labels (e.g. `status:in-review`, `status:ready`) for the workflow step
- If no `status:{name}` label is present, derive a default status from the state (`open` → `backlog`, `in_progress` → `in_progress`, `done` → `done`)
- On write: emit the appropriate `status:{name}` label; also set GitHub `state` (open/closed) based on the status's parent state

**Optional milestone:**
- Current implementation always sets `milestoneId` from `config.milestoneId`
- After migration: when issue has no milestone in GitHub, set `milestoneId = null`
- The GitHub adapter's `GitHubRepoConfig` may keep a default `milestoneId` for convenience, but it is no longer mandatory

**Milestone status and dueDate:**
- GitHub milestones already have `state` (open/closed) and `due_on` fields
- Current `toDomain` stores `github_state` in metadata but does not map to a domain `status` field
- After migration: map `state` → `status` ("open"/"closed") and `due_on` → `dueDate` directly

### JIRA Adapter (future)

**Hierarchy:**
- Maps natively to JIRA's Epic Link and Subtask relations
- `parentId` maps to Epic Link (for Story → Epic) or parent issue (for Subtask → Story)
- No encoding hacks needed

**State:**
- JIRA custom statuses each map to one of three state categories: `open`, `in_progress`, `done`
- Adapter maintains a JIRA-status-to-state mapping table
- State is derived from the JIRA status category, never written directly

**Status:**
- JIRA custom statuses (e.g., "In Review", "QA", "Waiting for Deploy") map directly to Meridian status names
- Adapter maintains a bidirectional mapping between JIRA status names and Meridian status names
- On write: find the JIRA status matching the requested Meridian status by name or state category

**Priority:**
- JIRA priorities ("Lowest", "Low", "Medium", "High", "Highest") map to Meridian's 4-level system
- "Lowest" and "Low" → `low`; "Medium" → `normal`; "High" → `high`; "Highest"/"Critical" → `urgent`

### Local Tracker (Python/SQLite)

**Hierarchy:**
- Add `parent_id` foreign key column to issues table (self-referential, nullable)
- SQLite trigger or application-level check for max depth = 3 and no cycles

**State/Status split:**
- Rename `status` column to `state`; change allowed values from `open, in_progress, closed` to `open, in_progress, done`
- Add `status` column (TEXT, default "backlog") for workflow step
- Migrate existing data: `closed` → `done` in state column; derive initial status from state (`open` → `backlog`, `in_progress` → `in_progress`, `done` → `done`)

**Optional milestone:**
- Change `milestone_id` column from NOT NULL to nullable

**Milestone status and dueDate:**
- Add `status` column (TEXT, default "open") and `due_date` column (DATE, nullable) to milestones table

**Epic removal:**
- If an epics table exists, migrate rows to issues table with `parent_id = NULL` and `metadata.type = "epic"`, then drop the epics table
