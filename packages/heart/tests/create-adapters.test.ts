import type { GitHubMeridianConfig, LocalMeridianConfig, MemoryMeridianConfig } from '../src/config/config-types.js'

import { GitHubIssueRepository, GitHubMilestoneRepository } from '@meridian/adapter-github'
import {
  InMemoryCommentRepository,
  InMemoryIssueRepository,
  InMemoryMilestoneRepository,
  InMemoryUserRepository,
} from '@meridian/core'
import { describe, expect, it, vi } from 'vitest'

import { createAdapters } from '../src/create-adapters.js'
import { createOctokit } from '../src/create-octokit.js'

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

function makeLocalConfig(overrides?: Partial<LocalMeridianConfig>): LocalMeridianConfig {
  return {
    adapter: 'local',
    server: { port: 3000, mcpTransport: 'stdio', mcpHttpPort: 3001 },
    logging: { level: 'info' },
    local: { trackerUrl: 'http://localhost:8000' },
    ...overrides,
  }
}

describe('createAdapters -- Memory Adapter', () => {
  it('cA-01: returns all four repositories for memory config', () => {
    const result = createAdapters(makeMemoryConfig())

    expect(result.issueRepository).toBeDefined()
    expect(result.milestoneRepository).toBeDefined()
    expect(result.commentRepository).toBeDefined()
    expect(result.userRepository).toBeDefined()
  })

  it('cA-02: all repos are InMemory instances for memory', () => {
    const result = createAdapters(makeMemoryConfig())

    expect(result.issueRepository).toBeInstanceOf(InMemoryIssueRepository)
    expect(result.milestoneRepository).toBeInstanceOf(InMemoryMilestoneRepository)
    expect(result.commentRepository).toBeInstanceOf(InMemoryCommentRepository)
    expect(result.userRepository).toBeInstanceOf(InMemoryUserRepository)
  })
})

describe('createAdapters -- Local Adapter', () => {
  it('cA-03: returns all four repositories for local config', () => {
    const result = createAdapters(makeLocalConfig())

    expect(result.issueRepository).toBeDefined()
    expect(result.milestoneRepository).toBeDefined()
    expect(result.commentRepository).toBeDefined()
    expect(result.userRepository).toBeDefined()
  })

  it('cA-04: local adapter uses InMemory instances (stub)', () => {
    const result = createAdapters(makeLocalConfig())

    expect(result.issueRepository).toBeInstanceOf(InMemoryIssueRepository)
    expect(result.milestoneRepository).toBeInstanceOf(InMemoryMilestoneRepository)
    expect(result.commentRepository).toBeInstanceOf(InMemoryCommentRepository)
    expect(result.userRepository).toBeInstanceOf(InMemoryUserRepository)
  })
})

describe('createAdapters -- GitHub Adapter', () => {
  it('cA-05: returns all four repositories for github config', () => {
    const result = createAdapters(makeGitHubConfig())

    expect(result.issueRepository).toBeDefined()
    expect(result.milestoneRepository).toBeDefined()
    expect(result.commentRepository).toBeDefined()
    expect(result.userRepository).toBeDefined()
  })

  it('cA-06: issueRepository is GitHubIssueRepository', () => {
    const result = createAdapters(makeGitHubConfig())

    expect(result.issueRepository).toBeInstanceOf(GitHubIssueRepository)
  })

  it('cA-07: milestoneRepository is GitHubMilestoneRepository', () => {
    const result = createAdapters(makeGitHubConfig())

    expect(result.milestoneRepository).toBeInstanceOf(GitHubMilestoneRepository)
  })

  it('cA-08: commentRepository falls back to InMemory', () => {
    const result = createAdapters(makeGitHubConfig())

    expect(result.commentRepository).toBeInstanceOf(InMemoryCommentRepository)
  })

  it('cA-09: userRepository falls back to InMemory', () => {
    const result = createAdapters(makeGitHubConfig())

    expect(result.userRepository).toBeInstanceOf(InMemoryUserRepository)
  })

  it('cA-10: calls createOctokit with github config', () => {
    vi.mocked(createOctokit).mockClear()

    createAdapters(makeGitHubConfig())

    expect(createOctokit).toHaveBeenCalledOnce()
    expect(createOctokit).toHaveBeenCalledWith({ token: 'ghp_test', owner: 'octocat', repo: 'hello-world' })
  })

  it('cA-11: generates deterministic milestoneId when not provided', () => {
    expect(() => createAdapters(makeGitHubConfig())).not.toThrow()
  })

  it('cA-12: uses explicit milestoneId when provided', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const config = makeGitHubConfig({
      github: { token: 'ghp_test', owner: 'octocat', repo: 'hello-world', milestoneId: uuid },
    })

    expect(() => createAdapters(config)).not.toThrow()
  })
})

describe('createAdapters -- Edge Cases', () => {
  it('eC-01: each call to createAdapters returns fresh instances', () => {
    const config = makeMemoryConfig()
    const first = createAdapters(config)
    const second = createAdapters(config)

    expect(first.issueRepository).not.toBe(second.issueRepository)
  })

  it('eC-03: AdapterSet shape has exactly four keys', () => {
    const result = createAdapters(makeMemoryConfig())
    const keys = Object.keys(result)

    expect(keys).toHaveLength(4)
    expect(keys).toContain('issueRepository')
    expect(keys).toContain('milestoneRepository')
    expect(keys).toContain('commentRepository')
    expect(keys).toContain('userRepository')
  })
})
