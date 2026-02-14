# Hexagonal Architecture Patterns — Heart

## Overview

Heart uses hexagonal (ports & adapters) architecture to keep the domain logic independent of external concerns (databases, APIs, frameworks).

## Layers

### Domain (core package)
The innermost layer. Contains:
- **Entities**: Domain objects with behavior (e.g., `Issue`, `Epic`, `Sprint`)
- **Value objects**: Immutable typed values (e.g., `IssueId`, `Priority`)
- **Ports**: Interfaces that define what the domain needs from the outside world
- **Use cases**: Application logic that orchestrates domain operations
- **Domain errors**: Typed error classes for domain-specific failures

```typescript
// Port interface — defined in core, implemented by adapters
export interface IIssueRepository {
  findById: (id: IssueId) => Promise<Issue | null>
  findAll: (filter: IssueFilter) => Promise<Issue[]>
  save: (issue: Issue) => Promise<Issue>
  delete: (id: IssueId) => Promise<void>
}
```

```typescript
// Use case — depends only on ports, never on adapters
export class CreateIssueUseCase {
  constructor(private readonly issueRepo: IIssueRepository) {}

  async execute(input: CreateIssueInput): Promise<Issue> {
    const issue = Issue.create(input)
    return this.issueRepo.save(issue)
  }
}
```

### Adapters (adapter-* packages)
Implement core ports for specific external services:

```typescript
// Adapter — implements the port interface
export class GitHubIssueRepository implements IIssueRepository {
  constructor(private readonly octokit: Octokit) {}

  async findById(id: IssueId): Promise<Issue | null> {
    const response = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: id.value,
    })
    return mapGitHubIssueToEntity(response.data)
  }
  // ...
}
```

### Mappers
Each adapter has mappers that convert between external formats and domain entities:

```typescript
// Mapper — converts GitHub API response to domain entity
export function mapGitHubIssueToEntity(raw: GitHubIssue): Issue {
  return Issue.create({
    title: raw.title,
    description: raw.body ?? '',
    status: mapGitHubStateToStatus(raw.state),
    priority: extractPriorityFromLabels(raw.labels),
  })
}
```

### Composition Root (heart package)
Wires everything together at startup:

```typescript
// Composition root — creates adapters and injects them into use cases
export function createApp(config: AppConfig) {
  const octokit = new Octokit({ auth: config.githubToken })
  const issueRepo = new GitHubIssueRepository(octokit)
  const createIssue = new CreateIssueUseCase(issueRepo)
  // ...
}
```

## Dependency Rules

1. **Core depends on nothing** — no imports from adapter-*, rest-api, or external libraries (except Zod for schemas)
2. **Adapters depend on core** — import port interfaces and domain entities
3. **REST API depends on core** — import use cases and domain types
4. **Heart depends on everything** — wires adapters to ports
5. **Shared is utility-only** — no domain logic, no port references

## File Organization per Package

```
packages/adapter-github/
  src/
    adapter.ts          # IIssueRepository implementation
    mapper.ts           # GitHub <-> domain mappers
    types.ts            # GitHub-specific types
    index.ts            # Public exports
  tests/
    adapter.test.ts     # Adapter tests with mocked Octokit
    mapper.test.ts      # Mapper unit tests
  package.json
  tsconfig.json
```
