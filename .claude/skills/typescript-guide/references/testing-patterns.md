# Testing Patterns — Heart (TypeScript)

## Overview

Heart uses Vitest for all TypeScript testing. Tests follow the Arrange-Act-Assert pattern and are organized by package.

## Setup

### Configuration

```typescript
// vitest.config.ts (root)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
})
```

### Running tests

> **Important**: Always use `.claude/scripts/run-tests.sh` wrapper — see CLAUDE.md.

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @meridian/core test

# Watch mode
pnpm test -- --watch

# With coverage
pnpm test -- --coverage
```

## File Organization

```
packages/core/
  tests/
    entities/
      issue.test.ts
    use-cases/
      create-issue.test.ts
    helpers/
      fixtures.ts        # Shared test data
```

- Test files: `[name].test.ts`
- Test helpers: `helpers/` directory within tests
- Fixtures: factory functions that create test data

## Patterns

### Unit test structure

```typescript
import { describe, expect, it } from 'vitest'
import { Issue } from '../src/entities/issue'

describe('Issue', () => {
  describe('create', () => {
    it('creates an issue with valid input', () => {
      // Arrange
      const input = {
        title: 'Fix login bug',
        description: 'Login fails on mobile',
        priority: 'high' as const,
        labels: ['bug'],
      }

      // Act
      const issue = Issue.create(input)

      // Assert
      expect(issue.title).toBe('Fix login bug')
      expect(issue.status).toBe('open')
      expect(issue.priority).toBe('high')
    })

    it('throws on empty title', () => {
      // Arrange
      const input = { title: '', description: '', priority: 'low' as const, labels: [] }

      // Act & Assert
      expect(() => Issue.create(input)).toThrow('Title is required')
    })
  })
})
```

### Mocking port interfaces

```typescript
import type { IIssueRepository } from '../src/ports/issue-repository'
import { describe, expect, it, vi } from 'vitest'
import { CreateIssueUseCase } from '../src/use-cases/create-issue'

describe('CreateIssueUseCase', () => {
  it('saves the issue via repository', async () => {
    // Arrange
    const mockRepo: IIssueRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn().mockResolvedValue({ id: '123', title: 'Test' }),
      delete: vi.fn(),
    }
    const useCase = new CreateIssueUseCase(mockRepo)

    // Act
    const result = await useCase.execute({ title: 'Test', description: '', priority: 'low', labels: [] })

    // Assert
    expect(mockRepo.save).toHaveBeenCalledOnce()
    expect(result.id).toBe('123')
  })
})
```

### Testing adapters

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GitHubIssueRepository } from '../src/adapter'

describe('GitHubIssueRepository', () => {
  let mockOctokit: any
  let repo: GitHubIssueRepository

  beforeEach(() => {
    mockOctokit = {
      issues: {
        get: vi.fn(),
        listForRepo: vi.fn(),
        create: vi.fn(),
      },
    }
    repo = new GitHubIssueRepository(mockOctokit)
  })

  it('maps GitHub issue to domain entity', async () => {
    // Arrange
    mockOctokit.issues.get.mockResolvedValue({
      data: { title: 'Bug', body: 'Details', state: 'open', labels: [] },
    })

    // Act
    const issue = await repo.findById('1')

    // Assert
    expect(issue).not.toBeNull()
    expect(issue!.title).toBe('Bug')
    expect(issue!.status).toBe('open')
  })
})
```

### Fixture factories

```typescript
// tests/helpers/fixtures.ts
import type { Issue } from '../../src/entities/issue'

export function createIssueFixture(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'test-id-1',
    title: 'Test Issue',
    description: 'A test issue',
    status: 'open',
    priority: 'medium',
    assigneeId: null,
    labels: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}
```

## Conventions

- One `describe` block per module/class, nested `describe` per method
- Test names describe behavior: "creates an issue with valid input", not "test create"
- Use `vi.fn()` for mocking, never manual mock implementations
- Use `beforeEach` for common setup, not `beforeAll` (isolate tests)
- No `any` types in test code — mock types properly
- Prefer `toThrow` with specific message over just `toThrow()`
