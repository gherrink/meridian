import type { IssueId, MilestoneId } from '@meridian/core'
import type { GitHubIssueResponse } from '../../src/mappers/issue-mapper.js'

import {
  AuthorizationError,
  DomainError,
  NotFoundError,
  ValidationError,
} from '@meridian/core'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { Octokit } from 'octokit'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { GitHubIssueRepository } from '../../src/github-issue-repository.js'
import { toDomain } from '../../src/mappers/issue-mapper.js'
import {
  GITHUB_ISSUE_CLOSED,
  GITHUB_ISSUE_IN_PROGRESS,
  GITHUB_ISSUE_MINIMAL,
  GITHUB_ISSUE_OPEN,
  GITHUB_ISSUE_WITH_STRING_LABELS,
} from '../fixtures/github-responses.js'
import { defaultHandlers } from './msw-handlers.js'

const TEST_MILESTONE_ID = '550e8400-e29b-41d4-a716-446655440003' as MilestoneId

const TEST_CONFIG = {
  owner: 'test-owner',
  repo: 'test-repo',
  milestoneId: TEST_MILESTONE_ID,
}

const server = setupServer(...defaultHandlers)

// Standard Octokit instance for happy-path tests
const octokit = new Octokit({ auth: 'test-token' })

// Octokit with retry/throttle disabled for error-path tests that would otherwise timeout
const octokitNoRetry = new Octokit({
  auth: 'test-token',
  retry: { enabled: false },
  throttle: { enabled: false },
})

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('mSW-based Issue Repository Integration Tests', () => {
  describe('create', () => {
    it('mI-01: create returns domain Issue', async () => {
      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repo.create({
        milestoneId: TEST_MILESTONE_ID,
        title: 'Fix login button',
      })

      expect(result.title).toBe('Fix login button')
      expect(result.status).toBe('open')
      expect(result.priority).toBe('high')
      expect(result.id).toBeDefined()
      expect(result.metadata.github_number).toBe(42)
    })

    it('mI-02: create with description and priority', async () => {
      let capturedBody: Record<string, unknown> | undefined

      server.use(
        http.post('https://api.github.com/repos/:owner/:repo/issues', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>
          const response: GitHubIssueResponse = {
            ...GITHUB_ISSUE_OPEN,
            title: capturedBody.title as string,
            body: capturedBody.body as string,
            labels: [
              { id: 1002, name: 'priority:urgent', color: 'b60205' },
            ],
          }
          return HttpResponse.json(response, { status: 201 })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repo.create({
        milestoneId: TEST_MILESTONE_ID,
        title: 'T',
        description: 'D',
        priority: 'urgent',
      })

      expect(capturedBody).toBeDefined()
      expect(capturedBody!.labels).toContain('priority:urgent')
      expect(result).toBeDefined()
    })

    it('mI-03: create validates empty title', async () => {
      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await expect(repo.create({
        milestoneId: TEST_MILESTONE_ID,
        title: '',
      })).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('mI-04: getById returns domain Issue', async () => {
      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)

      repo.populateCache(domainIssue.id, 42)

      const result = await repo.getById(domainIssue.id)

      expect(result.title).toBe('Fix login button')
      expect(result.metadata.github_number).toBe(42)
    })

    it('mI-05: getById throws NotFoundError for uncached id', async () => {
      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await expect(repo.getById('unknown-uuid' as IssueId)).rejects.toThrow(NotFoundError)
    })

    it('mI-06: getById maps 404 from API', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json({ message: 'Not Found' }, { status: 404 })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 42)

      await expect(repo.getById(domainIssue.id)).rejects.toThrow(NotFoundError)
    })
  })

  describe('update', () => {
    it('mI-07: update fetches current then patches', async () => {
      let patchBody: Record<string, unknown> | undefined

      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json(GITHUB_ISSUE_OPEN)
        }),
        http.patch('https://api.github.com/repos/:owner/:repo/issues/:number', async ({ request }) => {
          patchBody = await request.json() as Record<string, unknown>
          return HttpResponse.json({
            ...GITHUB_ISSUE_OPEN,
            title: 'New',
          })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 42)

      const result = await repo.update(domainIssue.id, { title: 'New' })

      expect(patchBody).toBeDefined()
      expect(patchBody!.title).toBe('New')
      expect(result.title).toBe('New')
    })

    it('mI-08: update preserves non-managed labels', async () => {
      let patchBody: Record<string, unknown> | undefined

      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json({
            ...GITHUB_ISSUE_OPEN,
            labels: [
              { id: 1, name: 'bug', color: 'fc2929' },
              { id: 2, name: 'priority:high', color: 'ff0000' },
            ],
          })
        }),
        http.patch('https://api.github.com/repos/:owner/:repo/issues/:number', async ({ request }) => {
          patchBody = await request.json() as Record<string, unknown>
          return HttpResponse.json({
            ...GITHUB_ISSUE_OPEN,
            labels: [
              { id: 1, name: 'bug', color: 'fc2929' },
              { id: 3, name: 'priority:low', color: '00ff00' },
            ],
          })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 42)

      await repo.update(domainIssue.id, { priority: 'low' })

      expect(patchBody).toBeDefined()
      const labels = patchBody!.labels as string[]
      expect(labels).toContain('bug')
      expect(labels).toContain('priority:low')
      expect(labels).not.toContain('priority:high')
    })

    it('mI-09: update changes status to closed', async () => {
      let patchBody: Record<string, unknown> | undefined

      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json(GITHUB_ISSUE_OPEN)
        }),
        http.patch('https://api.github.com/repos/:owner/:repo/issues/:number', async ({ request }) => {
          patchBody = await request.json() as Record<string, unknown>
          return HttpResponse.json({
            ...GITHUB_ISSUE_OPEN,
            state: 'closed',
          })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 42)

      await repo.update(domainIssue.id, { status: 'closed' })

      expect(patchBody).toBeDefined()
      expect(patchBody!.state).toBe('closed')
    })

    it('mI-10: update throws NotFoundError for uncached id', async () => {
      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await expect(repo.update('unknown' as IssueId, { title: 'X' })).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('mI-11: delete closes issue with deleted label', async () => {
      let patchBody: Record<string, unknown> | undefined

      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json(GITHUB_ISSUE_OPEN)
        }),
        http.patch('https://api.github.com/repos/:owner/:repo/issues/:number', async ({ request }) => {
          patchBody = await request.json() as Record<string, unknown>
          return HttpResponse.json({
            ...GITHUB_ISSUE_OPEN,
            state: 'closed',
          })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 42)

      await repo.delete(domainIssue.id)

      expect(patchBody).toBeDefined()
      expect(patchBody!.state).toBe('closed')
      expect(patchBody!.labels).toContain('deleted')

      // Cache should be cleared
      await expect(repo.getById(domainIssue.id)).rejects.toThrow(NotFoundError)
    })

    it('mI-12: delete throws NotFoundError for uncached id', async () => {
      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await expect(repo.delete('unknown' as IssueId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('list', () => {
    it('mI-13: list returns paginated issues', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.json([GITHUB_ISSUE_OPEN, GITHUB_ISSUE_CLOSED])
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repo.list({}, { page: 1, limit: 20 })

      expect(result.items).toHaveLength(2)
      expect(result.page).toBe(1)
      expect(result.total).toBe(2)
    })

    it('mI-14: list filters pull requests', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues', () => {
          const issueWithPR = { ...GITHUB_ISSUE_CLOSED, pull_request: {} }
          return HttpResponse.json([GITHUB_ISSUE_OPEN, issueWithPR])
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repo.list({}, { page: 1, limit: 20 })

      expect(result.items).toHaveLength(1)
    })

    it('mI-15: list populates cache for retrieved issues', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.json([GITHUB_ISSUE_OPEN])
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const listResult = await repo.list({}, { page: 1, limit: 10 })
      const listedIssueId = listResult.items[0]!.id

      // getById should succeed because list populated the cache
      const getResult = await repo.getById(listedIssueId)
      expect(getResult.title).toBe('Fix login button')
    })

    it('mI-16: list with status filter sends state param', async () => {
      let capturedUrl: URL | undefined

      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues', ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json([GITHUB_ISSUE_CLOSED])
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await repo.list({ status: 'closed' }, { page: 1, limit: 20 })

      expect(capturedUrl).toBeDefined()
      expect(capturedUrl!.searchParams.get('state')).toBe('closed')
    })

    it('mI-17: list with priority filter sends label param', async () => {
      let capturedUrl: URL | undefined

      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues', ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json([GITHUB_ISSUE_OPEN])
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await repo.list({ priority: 'high' }, { page: 1, limit: 20 })

      expect(capturedUrl).toBeDefined()
      expect(capturedUrl!.searchParams.get('labels')).toContain('priority:high')
    })

    it('mI-18: list with assignee filter', async () => {
      let capturedUrl: URL | undefined

      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues', ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json([GITHUB_ISSUE_OPEN])
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await repo.list({ assigneeId: 'octocat' }, { page: 1, limit: 20 })

      expect(capturedUrl).toBeDefined()
      expect(capturedUrl!.searchParams.get('assignee')).toBe('octocat')
    })

    it('mI-19: list with sort options', async () => {
      let capturedUrl: URL | undefined

      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues', ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json([])
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await repo.list({}, { page: 1, limit: 20 }, { field: 'createdAt', direction: 'desc' })

      expect(capturedUrl).toBeDefined()
      expect(capturedUrl!.searchParams.get('sort')).toBe('created')
      expect(capturedUrl!.searchParams.get('direction')).toBe('desc')
    })

    it('mI-20: list pagination with Link header', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues', () => {
          const items = Array.from({ length: 10 }, (_, i) => ({
            ...GITHUB_ISSUE_OPEN,
            number: i + 1,
          }))
          return HttpResponse.json(items, {
            headers: {
              Link: '<https://api.github.com/repos/test-owner/test-repo/issues?page=5>; rel="last", <https://api.github.com/repos/test-owner/test-repo/issues?page=2>; rel="next"',
            },
          })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repo.list({}, { page: 1, limit: 10 })

      expect(result.total).toBe(50)
    })

    it('mI-21: search delegates to search API', async () => {
      let capturedUrl: URL | undefined

      server.use(
        http.get('https://api.github.com/search/issues', ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json({
            total_count: 1,
            incomplete_results: false,
            items: [GITHUB_ISSUE_OPEN],
          })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repo.list({ search: 'login' }, { page: 1, limit: 20 })

      expect(capturedUrl).toBeDefined()
      const query = capturedUrl!.searchParams.get('q') ?? ''
      expect(query).toContain('repo:test-owner/test-repo')
      expect(query).toContain('is:issue')
      expect(query).toContain('login')
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it('mI-22: search filters PRs from results', async () => {
      server.use(
        http.get('https://api.github.com/search/issues', () => {
          const issueWithPR = { ...GITHUB_ISSUE_CLOSED, pull_request: {} }
          return HttpResponse.json({
            total_count: 2,
            incomplete_results: false,
            items: [GITHUB_ISSUE_OPEN, issueWithPR],
          })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repo.list({ search: 'fix' }, { page: 1, limit: 20 })

      expect(result.items).toHaveLength(1)
    })

    it('mI-23: search with status builds correct query', async () => {
      let capturedUrl: URL | undefined

      server.use(
        http.get('https://api.github.com/search/issues', ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json({
            total_count: 0,
            incomplete_results: false,
            items: [],
          })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await repo.list({ search: 'bug', status: 'closed' }, { page: 1, limit: 20 })

      expect(capturedUrl).toBeDefined()
      const query = capturedUrl!.searchParams.get('q') ?? ''
      expect(query).toContain('is:closed')
    })

    it('mI-24: search with in_progress adds label qualifier', async () => {
      let capturedUrl: URL | undefined

      server.use(
        http.get('https://api.github.com/search/issues', ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json({
            total_count: 0,
            incomplete_results: false,
            items: [],
          })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await repo.list({ search: 'dark', status: 'in_progress' }, { page: 1, limit: 20 })

      expect(capturedUrl).toBeDefined()
      const query = capturedUrl!.searchParams.get('q') ?? ''
      expect(query).toContain('is:open')
      expect(query).toContain('label:status:in-progress')
    })

    it('mI-25: list empty result', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.json([])
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repo.list({}, { page: 1, limit: 20 })

      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('error handling', () => {
    it('mE-01: 401 maps to AuthorizationError', async () => {
      server.use(
        http.post('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.json({ message: 'Bad credentials' }, { status: 401 })
        }),
      )

      const repo = new GitHubIssueRepository(octokitNoRetry, TEST_CONFIG)

      try {
        await repo.create({ milestoneId: TEST_MILESTONE_ID, title: 'Test' })
        expect.fail('should have thrown')
      }
      catch (error) {
        expect(error).toBeInstanceOf(AuthorizationError)
        expect((error as AuthorizationError).message).toContain('Invalid or expired')
      }
    })

    it('mE-02: 403 maps to AuthorizationError with permissions', async () => {
      server.use(
        http.post('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.json(
            { message: 'Forbidden' },
            {
              status: 403,
              headers: { 'x-accepted-github-permissions': 'issues:write' },
            },
          )
        }),
      )

      const repo = new GitHubIssueRepository(octokitNoRetry, TEST_CONFIG)

      try {
        await repo.create({ milestoneId: TEST_MILESTONE_ID, title: 'Test' })
        expect.fail('should have thrown')
      }
      catch (error) {
        expect(error).toBeInstanceOf(AuthorizationError)
        expect((error as AuthorizationError).message).toContain('issues:write')
      }
    })

    it('mE-03: 403 without permission header', async () => {
      server.use(
        http.post('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.json(
            { message: 'Forbidden' },
            { status: 403 },
          )
        }),
      )

      const repo = new GitHubIssueRepository(octokitNoRetry, TEST_CONFIG)

      try {
        await repo.create({ milestoneId: TEST_MILESTONE_ID, title: 'Test' })
        expect.fail('should have thrown')
      }
      catch (error) {
        expect(error).toBeInstanceOf(AuthorizationError)
        expect((error as AuthorizationError).message).toContain('repo, public_repo, read:org')
      }
    })

    it('mE-04: 404 maps to NotFoundError', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json({ message: 'Not Found' }, { status: 404 })
        }),
      )

      const repo = new GitHubIssueRepository(octokitNoRetry, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 42)

      await expect(repo.getById(domainIssue.id)).rejects.toThrow(NotFoundError)
    })

    it('mE-05: 422 maps to ValidationError', async () => {
      server.use(
        http.post('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.json(
            { message: 'Validation Failed', errors: [{ field: 'title', message: 'missing' }] },
            { status: 422 },
          )
        }),
      )

      const repo = new GitHubIssueRepository(octokitNoRetry, TEST_CONFIG)

      try {
        await repo.create({ milestoneId: TEST_MILESTONE_ID, title: 'X' })
        expect.fail('should have thrown')
      }
      catch (error) {
        expect(error).toBeInstanceOf(ValidationError)
        expect((error as ValidationError).field).toBe('title')
      }
    })

    it('mE-06: 429 maps to DomainError RATE_LIMITED', async () => {
      server.use(
        http.post('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.json(
            { message: 'rate limit exceeded' },
            {
              status: 429,
              headers: { 'x-ratelimit-reset': '1700000000' },
            },
          )
        }),
      )

      const repo = new GitHubIssueRepository(octokitNoRetry, TEST_CONFIG)

      try {
        await repo.create({ milestoneId: TEST_MILESTONE_ID, title: 'Test' })
        expect.fail('should have thrown')
      }
      catch (error) {
        expect(error).toBeInstanceOf(DomainError)
        expect((error as DomainError).code).toBe('RATE_LIMITED')
        expect((error as DomainError).message).toContain('Rate limited')
      }
    })

    it('mE-07: 429 without reset header', async () => {
      server.use(
        http.post('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.json(
            { message: 'rate limit exceeded' },
            { status: 429 },
          )
        }),
      )

      const repo = new GitHubIssueRepository(octokitNoRetry, TEST_CONFIG)

      try {
        await repo.create({ milestoneId: TEST_MILESTONE_ID, title: 'Test' })
        expect.fail('should have thrown')
      }
      catch (error) {
        expect(error).toBeInstanceOf(DomainError)
        expect((error as DomainError).code).toBe('RATE_LIMITED')
        expect((error as DomainError).message).toContain('Rate limited by GitHub API')
      }
    })

    it('mE-08: 500 maps to server error', async () => {
      server.use(
        http.post('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 },
          )
        }),
      )

      const repo = new GitHubIssueRepository(octokitNoRetry, TEST_CONFIG)

      try {
        await repo.create({ milestoneId: TEST_MILESTONE_ID, title: 'Test' })
        expect.fail('should have thrown')
      }
      catch (error) {
        expect(error).toBeInstanceOf(DomainError)
        expect((error as DomainError).code).toBe('GITHUB_SERVER_ERROR')
      }
    })

    it('mE-09: unknown error maps to DomainError', async () => {
      server.use(
        http.post('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.error()
        }),
      )

      const repo = new GitHubIssueRepository(octokitNoRetry, TEST_CONFIG)

      try {
        await repo.create({ milestoneId: TEST_MILESTONE_ID, title: 'Test' })
        expect.fail('should have thrown')
      }
      catch (error) {
        expect(error).toBeInstanceOf(DomainError)
        // Network-level errors from MSW get mapped to either GITHUB_ERROR or GITHUB_SERVER_ERROR
        // depending on how Octokit wraps them
        const code = (error as DomainError).code
        expect(['GITHUB_ERROR', 'GITHUB_SERVER_ERROR']).toContain(code)
      }
    })
  })

  describe('response mapping', () => {
    it('mM-01: maps labels to priority', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json(GITHUB_ISSUE_OPEN)
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 42)

      const result = await repo.getById(domainIssue.id)

      expect(result.priority).toBe('high')
    })

    it('mM-02: maps status:in-progress label', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json(GITHUB_ISSUE_IN_PROGRESS)
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_IN_PROGRESS, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 99)

      const result = await repo.getById(domainIssue.id)

      expect(result.status).toBe('in_progress')
    })

    it('mM-03: maps closed state', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json(GITHUB_ISSUE_CLOSED)
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_CLOSED, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 13)

      const result = await repo.getById(domainIssue.id)

      expect(result.status).toBe('closed')
    })

    it('mM-04: maps assignees to assigneeIds', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json(GITHUB_ISSUE_OPEN)
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 42)

      const result = await repo.getById(domainIssue.id)

      expect(result.assigneeIds).toBeDefined()
      expect(result.assigneeIds.length).toBeGreaterThan(0)
    })

    it('mM-05: maps minimal issue (null body, null assignees)', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json(GITHUB_ISSUE_MINIMAL)
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_MINIMAL, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 1)

      const result = await repo.getById(domainIssue.id)

      expect(result.description).toBe('')
      expect(result.assigneeIds).toEqual([])
      expect(result.priority).toBe('normal')
      expect(result.metadata.github_reactions).toBe(0)
    })

    it('mM-06: maps milestone metadata', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json({
            ...GITHUB_ISSUE_OPEN,
            milestone: { title: 'v1.0', number: 1 },
          })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 42)

      const result = await repo.getById(domainIssue.id)

      expect(result.metadata.github_milestone).toBe('v1.0')
    })

    it('mM-07: maps string labels', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json(GITHUB_ISSUE_WITH_STRING_LABELS)
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_WITH_STRING_LABELS, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 7)

      const result = await repo.getById(domainIssue.id)

      expect(result.priority).toBe('low')
      expect(result.tags.some(t => t.name === 'bug')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('eC-01: deterministic IDs are stable', async () => {
      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result1 = await repo.create({
        milestoneId: TEST_MILESTONE_ID,
        title: 'Fix login button',
      })

      // Create a new instance (clean cache) to get same issue again
      const repo2 = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const result2 = await repo2.create({
        milestoneId: TEST_MILESTONE_ID,
        title: 'Fix login button',
      })

      expect(result1.id).toBe(result2.id)
    })

    it('eC-02: list hasMore=true when items.length === limit', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.json([GITHUB_ISSUE_OPEN, GITHUB_ISSUE_CLOSED])
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repo.list({}, { page: 1, limit: 2 })

      expect(result.hasMore).toBe(true)
    })

    it('eC-03: list hasMore=false when items.length < limit', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.json([GITHUB_ISSUE_OPEN])
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repo.list({}, { page: 1, limit: 20 })

      expect(result.hasMore).toBe(false)
    })

    it('eC-04: search with empty string does not use search API', async () => {
      let searchCalled = false

      server.use(
        http.get('https://api.github.com/search/issues', () => {
          searchCalled = true
          return HttpResponse.json({
            total_count: 0,
            incomplete_results: false,
            items: [],
          })
        }),
        http.get('https://api.github.com/repos/:owner/:repo/issues', () => {
          return HttpResponse.json([GITHUB_ISSUE_OPEN])
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await repo.list({ search: '  ' }, { page: 1, limit: 20 })

      expect(searchCalled).toBe(false)
    })

    it('eC-05: update status to in_progress adds label', async () => {
      let patchBody: Record<string, unknown> | undefined

      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json(GITHUB_ISSUE_OPEN)
        }),
        http.patch('https://api.github.com/repos/:owner/:repo/issues/:number', async ({ request }) => {
          patchBody = await request.json() as Record<string, unknown>
          return HttpResponse.json({
            ...GITHUB_ISSUE_OPEN,
            labels: [
              ...GITHUB_ISSUE_OPEN.labels as Array<{ id: number, name: string, color: string }>,
              { id: 1005, name: 'status:in-progress', color: 'fbca04' },
            ],
          })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 42)

      await repo.update(domainIssue.id, { status: 'in_progress' })

      expect(patchBody).toBeDefined()
      const labels = patchBody!.labels as string[]
      expect(labels).toContain('status:in-progress')
      expect(patchBody!.state).toBe('open')
    })

    it('eC-06: delete preserves existing labels', async () => {
      let patchBody: Record<string, unknown> | undefined
      const issueWithLabels: GitHubIssueResponse = {
        ...GITHUB_ISSUE_OPEN,
        labels: [
          { id: 1, name: 'bug', color: 'fc2929' },
          { id: 2, name: 'enhancement', color: 'a2eeef' },
        ],
      }

      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
          return HttpResponse.json(issueWithLabels)
        }),
        http.patch('https://api.github.com/repos/:owner/:repo/issues/:number', async ({ request }) => {
          patchBody = await request.json() as Record<string, unknown>
          return HttpResponse.json({
            ...issueWithLabels,
            state: 'closed',
          })
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)
      const domainIssue = toDomain(issueWithLabels, TEST_CONFIG)
      repo.populateCache(domainIssue.id, 42)

      await repo.delete(domainIssue.id)

      expect(patchBody).toBeDefined()
      const labels = patchBody!.labels as string[]
      expect(labels).toContain('bug')
      expect(labels).toContain('enhancement')
      expect(labels).toContain('deleted')
    })

    it('eC-07: pagination total without Link header', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/issues', () => {
          const items = Array.from({ length: 5 }, (_, i) => ({
            ...GITHUB_ISSUE_OPEN,
            number: i + 1,
          }))
          return HttpResponse.json(items)
        }),
      )

      const repo = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repo.list({}, { page: 2, limit: 10 })

      // Without Link header, total = (page-1) * limit + items.length = (2-1)*10 + 5 = 15
      expect(result.total).toBe(15)
    })
  })
})
