import type { GitHubConfig } from '../src/config/config-types.js'

import { Octokit } from 'octokit'

import { describe, expect, it, vi } from 'vitest'
import { createOctokit } from '../src/create-octokit.js'

vi.mock('octokit', () => {
  const MockOctokit = vi.fn()
  return { Octokit: MockOctokit }
})

function makeGitHubConfig(overrides?: Partial<GitHubConfig>): GitHubConfig {
  return {
    token: 'ghp_testtoken123',
    owner: 'octocat',
    repo: 'hello-world',
    ...overrides,
  }
}

describe('createOctokit', () => {
  it('oK-01: creates Octokit with auth token from config', () => {
    createOctokit(makeGitHubConfig())

    expect(Octokit).toHaveBeenCalledWith({ auth: 'ghp_testtoken123' })
  })

  it('oK-02: returns the Octokit instance', () => {
    const result = createOctokit(makeGitHubConfig())

    expect(result).toBeInstanceOf(Octokit)
  })

  it('oK-03: passes different tokens correctly', () => {
    createOctokit(makeGitHubConfig({ token: 'ghp_other' }))

    expect(Octokit).toHaveBeenCalledWith({ auth: 'ghp_other' })
  })

  it('oK-04: does not pass owner/repo to Octokit', () => {
    createOctokit(makeGitHubConfig())

    const callArgs = vi.mocked(Octokit).mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined
    expect(callArgs).toBeDefined()
    expect(Object.keys(callArgs!)).toEqual(['auth'])
  })
})

describe('createOctokit -- edge cases', () => {
  it('eC-11: returns a new instance each call', () => {
    const config = makeGitHubConfig()
    const first = createOctokit(config)
    const second = createOctokit(config)

    expect(first).not.toBe(second)
  })
})
