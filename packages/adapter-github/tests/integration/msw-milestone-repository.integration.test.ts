import type { MilestoneId } from '@meridian/core'

import { NotFoundError } from '@meridian/core'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { Octokit } from 'octokit'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { GitHubMilestoneRepository } from '../../src/github-milestone-repository.js'
import { toDomain } from '../../src/mappers/milestone-mapper.js'
import { defaultHandlers, MILESTONE_CLOSED, MILESTONE_OPEN } from './msw-handlers.js'

const TEST_MILESTONE_ID = '550e8400-e29b-41d4-a716-446655440003' as MilestoneId

const TEST_CONFIG = {
  owner: 'test-owner',
  repo: 'test-repo',
  milestoneId: TEST_MILESTONE_ID,
}

const server = setupServer(...defaultHandlers)
const octokit = new Octokit({ auth: 'test-token' })

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('mSW-based Milestone Repository Integration Tests', () => {
  describe('create', () => {
    it('mP-01: create returns domain Milestone', async () => {
      const repo = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repo.create({ name: 'v1.0 Release' })

      expect(result.name).toBe('v1.0 Release')
      expect(result.id).toBeDefined()
      expect(result.metadata.github_milestone_number).toBe(3)
    })

    it('mP-02: create with description', async () => {
      let capturedBody: Record<string, unknown> | undefined

      server.use(
        http.post('https://api.github.com/repos/:owner/:repo/milestones', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>
          return HttpResponse.json(
            {
              ...MILESTONE_OPEN,
              title: capturedBody.title as string,
              description: capturedBody.description as string,
            },
            { status: 201 },
          )
        }),
      )

      const repo = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repo.create({ name: 'v2.0', description: 'Next major' })

      expect(capturedBody).toBeDefined()
      expect(capturedBody!.description).toBe('Next major')
      expect(result.description).toBe('Next major')
    })

    it('mP-03: create validates empty name', async () => {
      const repo = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      await expect(repo.create({ name: '' })).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('mP-04: getById returns domain Milestone', async () => {
      const repo = new GitHubMilestoneRepository(octokit, TEST_CONFIG)
      const domainMilestone = toDomain(MILESTONE_OPEN, TEST_CONFIG)
      repo.populateCache(domainMilestone.id, 3)

      const result = await repo.getById(domainMilestone.id)

      expect(result.name).toBe('v1.0 Release')
      expect(result.metadata.github_milestone_number).toBe(3)
    })

    it('mP-05: getById throws NotFoundError for uncached id', async () => {
      const repo = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      await expect(repo.getById('unknown' as MilestoneId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('update', () => {
    it('mP-06: update patches milestone', async () => {
      let patchBody: Record<string, unknown> | undefined

      server.use(
        http.patch('https://api.github.com/repos/:owner/:repo/milestones/:number', async ({ request }) => {
          patchBody = await request.json() as Record<string, unknown>
          return HttpResponse.json({
            ...MILESTONE_OPEN,
            title: patchBody.title as string ?? MILESTONE_OPEN.title,
          })
        }),
      )

      const repo = new GitHubMilestoneRepository(octokit, TEST_CONFIG)
      const domainMilestone = toDomain(MILESTONE_OPEN, TEST_CONFIG)
      repo.populateCache(domainMilestone.id, 3)

      const result = await repo.update(domainMilestone.id, { name: 'Updated' })

      expect(patchBody).toBeDefined()
      expect(result.name).toBe('Updated')
    })
  })

  describe('delete', () => {
    it('mP-07: delete calls deleteMilestone', async () => {
      let deleteCalled = false

      server.use(
        http.delete('https://api.github.com/repos/:owner/:repo/milestones/:number', () => {
          deleteCalled = true
          return new HttpResponse(null, { status: 204 })
        }),
      )

      const repo = new GitHubMilestoneRepository(octokit, TEST_CONFIG)
      const domainMilestone = toDomain(MILESTONE_OPEN, TEST_CONFIG)
      repo.populateCache(domainMilestone.id, 3)

      await repo.delete(domainMilestone.id)

      expect(deleteCalled).toBe(true)

      // Subsequent getById should throw NotFoundError (cache cleared)
      await expect(repo.getById(domainMilestone.id)).rejects.toThrow(NotFoundError)
    })
  })

  describe('list', () => {
    it('mP-08: list returns paginated milestones', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/milestones', () => {
          return HttpResponse.json([MILESTONE_OPEN, MILESTONE_CLOSED])
        }),
      )

      const repo = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repo.list({ page: 1, limit: 20 })

      expect(result.items).toHaveLength(2)
    })

    it('mP-09: list with sort options', async () => {
      let capturedUrl: URL | undefined

      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/milestones', ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json([])
        }),
      )

      const repo = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      await repo.list({ page: 1, limit: 20 }, { field: 'dueDate', direction: 'asc' })

      expect(capturedUrl).toBeDefined()
      expect(capturedUrl!.searchParams.get('sort')).toBe('due_on')
      expect(capturedUrl!.searchParams.get('direction')).toBe('asc')
    })

    it('mP-10: list pagination Link header', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/milestones', () => {
          const items = Array.from({ length: 10 }, (_, i) => ({
            ...MILESTONE_OPEN,
            number: i + 1,
            id: 200 + i,
          }))
          return HttpResponse.json(items, {
            headers: {
              Link: '<https://api.github.com/repos/test-owner/test-repo/milestones?page=3>; rel="last"',
            },
          })
        }),
      )

      const repo = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repo.list({ page: 1, limit: 10 })

      expect(result.total).toBe(30)
    })
  })

  describe('response mapping', () => {
    it('mM-08: milestone toDomain maps all fields', async () => {
      server.use(
        http.get('https://api.github.com/repos/:owner/:repo/milestones/:number', () => {
          return HttpResponse.json(MILESTONE_OPEN)
        }),
      )

      const repo = new GitHubMilestoneRepository(octokit, TEST_CONFIG)
      const domainMilestone = toDomain(MILESTONE_OPEN, TEST_CONFIG)
      repo.populateCache(domainMilestone.id, 3)

      const result = await repo.getById(domainMilestone.id)

      expect(result.metadata.github_state).toBe('open')
      expect(result.metadata.github_open_issues).toBe(5)
      expect(result.metadata.github_closed_issues).toBe(10)
    })
  })
})
