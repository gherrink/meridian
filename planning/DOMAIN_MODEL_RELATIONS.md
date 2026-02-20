# Domain Model — Issue Relationships

Implementation impact guide for adding issue relationships (issue links) to the domain model defined in [DOMAIN_MODEL.md](./DOMAIN_MODEL.md). This document covers what changes are needed across all three components (Heart, CLI, Tracker) to support the `IssueLink` entity and `RelationshipType` value object.

## 1. Overview

Issue relationships extend the domain model beyond parent/child hierarchy. While `parentId` models structural containment (Epic → Story → Subtask), issue links express cross-cutting associations between any two issues:

- **Blocking dependencies** — "Issue A blocks Issue B" (directed)
- **Duplicate tracking** — "Issue A duplicates Issue B" (directed)
- **General associations** — "Issue A relates to Issue B" (symmetric)

Each link is a typed connection stored once. Directed links have distinct forward/inverse labels; symmetric links use the same label in both directions. The set of available relationship types is project-configurable, with a default set of `blocks`, `duplicates`, and `relates to`.

## 2. Core Model Changes (Heart — TypeScript)

### New Files

| File | Purpose |
|---|---|
| `packages/core/src/model/issue-link.ts` | `IssueLinkSchema`, `CreateIssueLinkInputSchema`, `IssueLinkFilterSchema` — Zod schemas for the IssueLink entity |
| `packages/core/src/model/relationship-type.ts` | `RelationshipTypeSchema`, `RelationshipType` type, `DEFAULT_RELATIONSHIP_TYPES` — configurable relationship type definitions |
| `packages/core/src/ports/issue-link-repository.ts` | `IIssueLinkRepository` interface — port for IssueLink persistence |
| `packages/core/src/adapters/in-memory-issue-link-repository.ts` | `InMemoryIssueLinkRepository` — in-memory implementation for testing |
| `packages/core/src/use-cases/create-issue-link.ts` | `CreateIssueLinkUseCase` — validates type, prevents self-links and duplicates, normalizes symmetric links |
| `packages/core/src/use-cases/delete-issue-link.ts` | `DeleteIssueLinkUseCase` — removes a link by ID |
| `packages/core/src/use-cases/list-issue-links.ts` | `ListIssueLinksUseCase` — lists links for an issue (both directions), resolves labels by perspective |

### Modified Files

| File | Change |
|---|---|
| `packages/core/src/model/value-objects.ts` | Add `IssueLinkIdSchema` and `IssueLinkId` branded type |
| `packages/core/src/model/index.ts` | Re-export IssueLink and RelationshipType schemas/types |
| `packages/core/src/ports/index.ts` | Re-export `IIssueLinkRepository` |
| `packages/core/src/adapters/index.ts` | Re-export `InMemoryIssueLinkRepository` |
| `packages/core/src/use-cases/index.ts` | Re-export all IssueLink use cases |

### Schemas

**`IssueLinkSchema`:**
```typescript
{
  id: IssueLinkIdSchema,
  sourceIssueId: IssueIdSchema,
  targetIssueId: IssueIdSchema,
  type: z.string(),       // validated against configured relationship types
  createdAt: z.date(),
}
```

**`CreateIssueLinkInputSchema`:**
```typescript
{
  sourceIssueId: IssueIdSchema,
  targetIssueId: IssueIdSchema,
  type: z.string(),
}
```

**`IssueLinkFilterSchema`:**
```typescript
{
  issueId?: IssueIdSchema,     // links where issue is source OR target
  type?: z.string(),           // filter by relationship type
}
```

### Repository Interface

```typescript
interface IIssueLinkRepository {
  create(link: IssueLink): Promise<IssueLink>;
  delete(id: IssueLinkId): Promise<void>;
  findById(id: IssueLinkId): Promise<IssueLink | null>;
  findByIssueId(issueId: IssueId, filter?: { type?: string }): Promise<IssueLink[]>;
  findBySourceAndTargetAndType(
    sourceIssueId: IssueId,
    targetIssueId: IssueId,
    type: string,
  ): Promise<IssueLink | null>;
  deleteByIssueId(issueId: IssueId): Promise<void>;  // cascade on issue deletion
}
```

### Use Case Logic

**`CreateIssueLinkUseCase`:**
1. Validate `type` against configured relationship types
2. Reject if `sourceIssueId === targetIssueId` (no self-links)
3. Verify both issues exist
4. For symmetric types: normalize order so `sourceIssueId < targetIssueId` by UUID sort
5. Check for duplicate link (same source + target + type)
6. Create and return the link

**`ListIssueLinksUseCase`:**
1. Fetch all links where issue is source or target
2. For each link, resolve the label based on perspective:
   - If querying issue is source → forward label (e.g. "blocks")
   - If querying issue is target → inverse label (e.g. "is blocked by")
3. Return links with resolved labels and the linked issue's ID

### Test Files

| File | Purpose |
|---|---|
| `packages/core/tests/model/issue-link.test.ts` | Schema validation for IssueLink and CreateIssueLinkInput |
| `packages/core/tests/model/relationship-type.test.ts` | Relationship type validation, default set verification |
| `packages/core/tests/adapters/in-memory-issue-link-repository.test.ts` | Repository CRUD operations |
| `packages/core/tests/use-cases/create-issue-link.test.ts` | Self-link prevention, duplicate detection, symmetric normalization |
| `packages/core/tests/use-cases/delete-issue-link.test.ts` | Link deletion, cascade behavior |
| `packages/core/tests/use-cases/list-issue-links.test.ts` | Bidirectional listing, label resolution |

## 3. MCP Server Changes (Heart — TypeScript)

### New Tools

| Tool | Description | Input |
|---|---|---|
| `link_issues` | Create a typed link between two issues | `{ sourceIssueId, targetIssueId, type }` |
| `unlink_issues` | Remove a link by ID | `{ linkId }` |
| `list_issue_links` | List all links for an issue | `{ issueId, type? }` |

### Modified Files

| File | Change |
|---|---|
| `packages/mcp-server/src/tools/pm/link-issues.ts` | New tool: `link_issues` — delegates to `CreateIssueLinkUseCase` |
| `packages/mcp-server/src/tools/pm/unlink-issues.ts` | New tool: `unlink_issues` — delegates to `DeleteIssueLinkUseCase` |
| `packages/mcp-server/src/tools/pm/list-issue-links.ts` | New tool: `list_issue_links` — delegates to `ListIssueLinksUseCase` |
| `packages/mcp-server/src/tools/pm/index.ts` | Register all three new tools |
| `packages/mcp-server/src/types.ts` | Add `IIssueLinkRepository` and IssueLink use cases to dependency types |
| `packages/mcp-server/src/index.ts` | Wire `InMemoryIssueLinkRepository` and IssueLink use cases into server dependencies |

### Tool Output

`list_issue_links` returns an array of resolved link objects:

```json
[
  {
    "id": "link-uuid",
    "linkedIssueId": "other-issue-uuid",
    "type": "blocks",
    "label": "blocks",
    "direction": "outgoing",
    "createdAt": "2026-02-20T..."
  },
  {
    "id": "link-uuid-2",
    "linkedIssueId": "another-issue-uuid",
    "type": "blocks",
    "label": "is blocked by",
    "direction": "incoming",
    "createdAt": "2026-02-20T..."
  }
]
```

## 4. REST API Changes (Heart — TypeScript)

### New Endpoints

| Method | Path | Description | Request Body | Response |
|---|---|---|---|---|
| `POST` | `/issues/:id/links` | Create a link from this issue | `{ targetIssueId, type }` | `201` with created link |
| `GET` | `/issues/:id/links` | List links for an issue | Query: `?type=blocks` | `200` with resolved link array |
| `DELETE` | `/issue-links/:id` | Delete a link | — | `204` |

### Modified Files

| File | Change |
|---|---|
| `packages/rest-api/src/routes/issue-link-routes.ts` | New route file for all three endpoints |
| `packages/rest-api/src/routes/index.ts` | Register issue link routes |
| `packages/rest-api/src/schemas/issue-link-schemas.ts` | Zod schemas for request/response validation |
| `packages/rest-api/src/schemas/index.ts` | Re-export link schemas |

### Response Schema

```typescript
// POST /issues/:id/links — request body
{ targetIssueId: string, type: string }

// POST /issues/:id/links — response (201)
{ id: string, sourceIssueId: string, targetIssueId: string, type: string, createdAt: string }

// GET /issues/:id/links — response (200)
{ links: Array<{ id, linkedIssueId, type, label, direction, createdAt }> }

// DELETE /issue-links/:id — response (204, no body)
```

## 5. GitHub Adapter Changes (Heart — TypeScript)

### Encoding Strategy

GitHub Issues have no native link/relationship API. Links are encoded as HTML comments in the source issue's body:

```
<!-- meridian:blocks=owner/repo#42 -->
<!-- meridian:duplicates=owner/repo#17 -->
<!-- meridian:relates-to=owner/repo#8 -->
```

### New Files

| File | Purpose |
|---|---|
| `packages/adapter-github/src/mappers/issue-link-mapper.ts` | Parse `<!-- meridian:* -->` comments from issue bodies into `IssueLink` objects; serialize links back to HTML comments |
| `packages/adapter-github/src/repositories/github-issue-link-repository.ts` | `GitHubIssueLinkRepository` implementing `IIssueLinkRepository` — reads/writes links via issue body manipulation |

### Modified Files

| File | Change |
|---|---|
| `packages/adapter-github/src/mappers/issue-mapper.ts` | Use `issue-link-mapper` to extract links during `toDomain`; inject link comments during `toCreateParams`/`toUpdateParams` |
| `packages/adapter-github/src/repositories/github-issue-repository.ts` | On issue delete: delegate to `GitHubIssueLinkRepository.deleteByIssueId()` for cascade cleanup |

### Mapping Details

**Read (`toDomain`):**
1. Parse all `<!-- meridian:{type}=owner/repo#N -->` comments from issue body
2. For each match: generate deterministic UUIDs for source (current issue) and target (referenced issue)
3. Map comment type prefix to relationship type name (`blocks` → `"blocks"`, `relates-to` → `"relates to"`)

**Write (`toCreateParams` / `toUpdateParams`):**
1. Serialize each outgoing link as an HTML comment appended to the body
2. Remove stale link comments when links are deleted

**Symmetric handling:**
- For `relates-to` links, the adapter stores the comment on the issue with the lower GitHub number to avoid duplicates
- When querying links for an issue, the adapter checks both its own body and bodies of issues that reference it
