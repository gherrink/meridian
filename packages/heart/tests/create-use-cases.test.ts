import type { GitHubMeridianConfig, MemoryMeridianConfig } from '../src/config/config-types.js'

import {
  AssignIssueUseCase,
  CreateIssueUseCase,
  GetProjectOverviewUseCase,
  InMemoryAuditLogger,
  ListIssuesUseCase,
  UpdateIssueUseCase,
  UpdateStatusUseCase,
} from '@meridian/core'
import { describe, expect, it, vi } from 'vitest'

import { createAdapters } from '../src/create-adapters.js'
import { createUseCases } from '../src/create-use-cases.js'

vi.mock('octokit', () => {
  const MockOctokit = vi.fn()
  return { Octokit: MockOctokit }
})

const fakeOctokit = {
  rest: {
    issues: {
      create: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      listForRepo: vi.fn(),
      update: vi.fn(),
      listComments: vi.fn(),
      createComment: vi.fn(),
      updateComment: vi.fn(),
      deleteComment: vi.fn(),
    },
    search: {
      issuesAndPullRequests: vi.fn(),
    },
  },
}

vi.mock('../src/create-octokit.js', () => ({
  createOctokit: vi.fn(() => fakeOctokit),
}))

function makeMemoryConfig(overrides?: Partial<MemoryMeridianConfig>): MemoryMeridianConfig {
  return {
    adapter: 'memory',
    server: { port: 3000, mcpTransport: 'stdio', mcpHttpPort: 3001 },
    logging: { level: 'info' },
    ...overrides,
  }
}

function makeGitHubConfig(overrides?: Partial<GitHubMeridianConfig>): GitHubMeridianConfig {
  return {
    adapter: 'github',
    server: { port: 3000, mcpTransport: 'stdio', mcpHttpPort: 3001 },
    logging: { level: 'info' },
    github: { token: 'ghp_test', owner: 'octocat', repo: 'hello-world' },
    ...overrides,
  }
}

function makeAuditLogger(): InMemoryAuditLogger {
  return new InMemoryAuditLogger()
}

describe('createUseCases', () => {
  it('uC-01: returns all six use cases', () => {
    const adapters = createAdapters(makeMemoryConfig())
    const result = createUseCases(adapters, makeAuditLogger())

    expect(result.createIssue).toBeDefined()
    expect(result.listIssues).toBeDefined()
    expect(result.assignIssue).toBeDefined()
    expect(result.updateStatus).toBeDefined()
    expect(result.updateIssue).toBeDefined()
    expect(result.getProjectOverview).toBeDefined()
  })

  it('uC-02: createIssue is CreateIssueUseCase instance', () => {
    const adapters = createAdapters(makeMemoryConfig())
    const result = createUseCases(adapters, makeAuditLogger())

    expect(result.createIssue).toBeInstanceOf(CreateIssueUseCase)
  })

  it('uC-03: listIssues is ListIssuesUseCase instance', () => {
    const adapters = createAdapters(makeMemoryConfig())
    const result = createUseCases(adapters, makeAuditLogger())

    expect(result.listIssues).toBeInstanceOf(ListIssuesUseCase)
  })

  it('uC-04: assignIssue is AssignIssueUseCase instance', () => {
    const adapters = createAdapters(makeMemoryConfig())
    const result = createUseCases(adapters, makeAuditLogger())

    expect(result.assignIssue).toBeInstanceOf(AssignIssueUseCase)
  })

  it('uC-05: updateStatus is UpdateStatusUseCase instance', () => {
    const adapters = createAdapters(makeMemoryConfig())
    const result = createUseCases(adapters, makeAuditLogger())

    expect(result.updateStatus).toBeInstanceOf(UpdateStatusUseCase)
  })

  it('uC-06: updateIssue is UpdateIssueUseCase instance', () => {
    const adapters = createAdapters(makeMemoryConfig())
    const result = createUseCases(adapters, makeAuditLogger())

    expect(result.updateIssue).toBeInstanceOf(UpdateIssueUseCase)
  })

  it('uC-07: getProjectOverview is GetProjectOverviewUseCase instance', () => {
    const adapters = createAdapters(makeMemoryConfig())
    const result = createUseCases(adapters, makeAuditLogger())

    expect(result.getProjectOverview).toBeInstanceOf(GetProjectOverviewUseCase)
  })
})

describe('composition Integration (createAdapters + createUseCases together)', () => {
  it('cI-01: full wiring with memory adapter produces functional use cases', async () => {
    const adapters = createAdapters(makeMemoryConfig())
    const useCases = createUseCases(adapters, makeAuditLogger())

    const result = await useCases.listIssues.execute({}, { page: 1, limit: 10 })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items).toEqual([])
    }
  })

  it('cI-02: full wiring with github adapter produces use cases', () => {
    const adapters = createAdapters(makeGitHubConfig())
    const useCases = createUseCases(adapters, makeAuditLogger())

    expect(useCases.createIssue).toBeInstanceOf(CreateIssueUseCase)
    expect(useCases.listIssues).toBeInstanceOf(ListIssuesUseCase)
    expect(useCases.assignIssue).toBeInstanceOf(AssignIssueUseCase)
    expect(useCases.updateStatus).toBeInstanceOf(UpdateStatusUseCase)
    expect(useCases.updateIssue).toBeInstanceOf(UpdateIssueUseCase)
    expect(useCases.getProjectOverview).toBeInstanceOf(GetProjectOverviewUseCase)
  })
})

describe('createUseCases -- Edge Cases', () => {
  it('eC-02: each call to createUseCases returns fresh instances', () => {
    const adapters = createAdapters(makeMemoryConfig())
    const logger = makeAuditLogger()
    const first = createUseCases(adapters, logger)
    const second = createUseCases(adapters, logger)

    expect(first.createIssue).not.toBe(second.createIssue)
  })

  it('eC-04: UseCaseSet shape has exactly six keys', () => {
    const adapters = createAdapters(makeMemoryConfig())
    const result = createUseCases(adapters, makeAuditLogger())
    const keys = Object.keys(result)

    expect(keys).toHaveLength(6)
    expect(keys).toContain('createIssue')
    expect(keys).toContain('listIssues')
    expect(keys).toContain('assignIssue')
    expect(keys).toContain('updateStatus')
    expect(keys).toContain('updateIssue')
    expect(keys).toContain('getProjectOverview')
  })
})
