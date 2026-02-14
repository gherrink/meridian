# Zod Schema Patterns — Heart

## Overview

Heart uses Zod for runtime validation and type derivation. Schemas are the single source of truth for types — TypeScript types are inferred from Zod schemas, not defined separately.

## Core Schema Patterns

### Entity schemas

```typescript
import { z } from 'zod';

// Define the schema
export const IssueSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().default(''),
  status: z.enum(['open', 'in_progress', 'closed']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  assigneeId: z.string().uuid().nullable(),
  labels: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Infer the type from the schema
export type Issue = z.infer<typeof IssueSchema>;
```

### Input/output schemas

```typescript
// Input schema — subset of entity fields for creation
export const CreateIssueInputSchema = IssueSchema.pick({
  title: true,
  description: true,
  priority: true,
  labels: true,
}).extend({
  assigneeId: z.string().uuid().optional(),
});

export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>;

// Update schema — all fields optional
export const UpdateIssueInputSchema = CreateIssueInputSchema.partial();
export type UpdateIssueInput = z.infer<typeof UpdateIssueInputSchema>;
```

### Value object schemas

```typescript
export const IssueIdSchema = z.string().uuid().brand<'IssueId'>();
export type IssueId = z.infer<typeof IssueIdSchema>;

export const PrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type Priority = z.infer<typeof PrioritySchema>;
```

## REST API Validation

### Request validation with Hono

```typescript
import { zValidator } from '@hono/zod-validator';

app.post(
  '/api/v1/issues',
  zValidator('json', CreateIssueInputSchema),
  async (c) => {
    const input = c.req.valid('json');
    const issue = await createIssueUseCase.execute(input);
    return c.json(issue, 201);
  }
);
```

### Query parameter schemas

```typescript
export const IssueFilterSchema = z.object({
  status: z.enum(['open', 'in_progress', 'closed']).optional(),
  priority: PrioritySchema.optional(),
  assigneeId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
```

## Conventions

- Schemas live alongside their entities in the core package
- Schema names: `[Entity]Schema` (PascalCase + "Schema" suffix)
- Type names: inferred with `z.infer<typeof Schema>`
- Never define a TypeScript type manually when a Zod schema exists — always infer
- Use `.brand<>()` for value objects that need nominal typing
- Use `.pick()`, `.omit()`, `.partial()`, `.extend()` to derive sub-schemas
- Validate at system boundaries (API endpoints, adapter inputs), not internally
