import type { MilestoneId } from '@meridian/core'
import type { GitHubMilestoneResponse } from '../src/mappers/github-types.js'

import { AuthorizationError, DomainError, NotFoundError, ValidationError } from '@meridian/core'

import { describe, expect, it, vi } from 'vitest'
import { GitHubMilestoneRepository } from '../src/github-milestone-repository.js'
import { toDomain } from '../src/mappers/milestone-mapper.js'

const TEST_MILESTONE_ID = '550e8400-e29b-41d4-a716-446655440003' as MilestoneId

const TEST_CONFIG = {
  owner: 'test-owner',
  repo: 'test-repo',
  milestoneId: TEST_MILESTONE_ID,
}

function createMockOctokit() {
  return {
    rest: {
      issues: {
        createMilestone: vi.fn(),
        getMilestone: vi.fn(),
        updateMilestone: vi.fn(),
        deleteMilestone: vi.fn(),
        listMilestones: vi.fn(),
      },
    },
  }
}

const MILESTONE_OPEN: GitHubMilestoneResponse = {
  id: 200,
  number: 3,
  title: 'v1.0 Release',
  description: 'First stable release',
  state: 'open',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-02-01T00:00:00Z',
  html_url: 'https://github.com/test-owner/test-repo/milestone/3',
  open_issues: 5,
  closed_issues: 10,
}

const MILESTONE_CLOSED: GitHubMilestoneResponse = {
  id: 201,
  number: 4,
  title: 'v0.9 Beta',
  description: 'Beta release',
  state: 'closed',
  created_at: '2024-06-01T00:00:00Z',
  updated_at: '2024-12-01T00:00:00Z',
  html_url: 'https://github.com/test-owner/test-repo/milestone/4',
  open_issues: 0,
  closed_issues: 8,
}

describe('gitHubMilestoneRepository', () => {
  describe('create', () => {
    it('tC-01: calls createMilestone and returns domain Milestone', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.createMilestone.mockResolvedValue({ data: MILESTONE_OPEN })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repository.create({
        name: 'v1.0 Release',
        description: 'First stable release',
      })

      expect(result.name).toBe('v1.0 Release')
      expect(result.description).toBe('First stable release')
      expect(result.metadata.github_milestone_number).toBe(3)
      expect(octokit.rest.issues.createMilestone).toHaveBeenCalledTimes(1)
    })

    it('tC-02: validates input via CreateMilestoneInputSchema', async () => {
      const octokit = createMockOctokit()
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      await expect(repository.create({ name: '' })).rejects.toThrow()
      expect(octokit.rest.issues.createMilestone).not.toHaveBeenCalled()
    })

    it('tC-03: caches milestone number after create', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.createMilestone.mockResolvedValue({ data: MILESTONE_OPEN })
      octokit.rest.issues.getMilestone.mockResolvedValue({ data: MILESTONE_OPEN })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        name: 'v1.0 Release',
        description: 'First stable release',
      })

      const fetched = await repository.getById(created.id)

      expect(fetched).toBeDefined()
      expect(octokit.rest.issues.getMilestone).toHaveBeenCalledWith(
        expect.objectContaining({ milestone_number: 3 }),
      )
    })

    it('tC-04: maps 422 API error to ValidationError', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.createMilestone.mockRejectedValue({
        response: { status: 422, data: { message: 'Validation Failed', errors: [{ field: 'title', message: 'missing' }] } },
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      await expect(repository.create({
        name: 'Test',
        description: 'desc',
      })).rejects.toThrow(ValidationError)
    })

    it('tC-05: maps 401 API error to AuthorizationError', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.createMilestone.mockRejectedValue({
        response: { status: 401, data: { message: 'Bad credentials' } },
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      await expect(repository.create({
        name: 'Test',
        description: 'desc',
      })).rejects.toThrow(AuthorizationError)
    })
  })

  describe('getById', () => {
    it('tC-06: throws NotFoundError for uncached ID', async () => {
      const repository = new GitHubMilestoneRepository(createMockOctokit(), TEST_CONFIG)
      const unknownId = '00000000-0000-0000-0000-000000000000' as MilestoneId

      await expect(repository.getById(unknownId)).rejects.toThrow(NotFoundError)
    })

    it('tC-07: fetches milestone after populateCache', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.getMilestone.mockResolvedValue({ data: MILESTONE_OPEN })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const domainMilestone = toDomain(MILESTONE_OPEN, TEST_CONFIG)
      repository.populateCache(domainMilestone.id, 3)

      const result = await repository.getById(domainMilestone.id)

      expect(result.name).toBe('v1.0 Release')
      expect(octokit.rest.issues.getMilestone).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        milestone_number: 3,
      })
    })

    it('tC-08: maps 404 API error to NotFoundError', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.getMilestone.mockRejectedValue({
        response: { status: 404, data: { message: 'Not Found' } },
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const domainMilestone = toDomain(MILESTONE_OPEN, TEST_CONFIG)
      repository.populateCache(domainMilestone.id, 3)

      await expect(repository.getById(domainMilestone.id)).rejects.toThrow(NotFoundError)
    })

    it('tC-09: maps 403 API error to AuthorizationError', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.getMilestone.mockRejectedValue({
        response: { status: 403, data: { message: 'Forbidden' } },
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const domainMilestone = toDomain(MILESTONE_OPEN, TEST_CONFIG)
      repository.populateCache(domainMilestone.id, 3)

      await expect(repository.getById(domainMilestone.id)).rejects.toThrow(AuthorizationError)
    })
  })

  describe('update', () => {
    it('tC-10: throws NotFoundError for uncached ID', async () => {
      const repository = new GitHubMilestoneRepository(createMockOctokit(), TEST_CONFIG)
      const unknownId = '00000000-0000-0000-0000-000000000000' as MilestoneId

      await expect(repository.update(unknownId, { name: 'Updated' })).rejects.toThrow(NotFoundError)
    })

    it('tC-11: calls updateMilestone with correct params', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.createMilestone.mockResolvedValue({ data: MILESTONE_OPEN })
      const updatedMilestone: GitHubMilestoneResponse = { ...MILESTONE_OPEN, title: 'Updated' }
      octokit.rest.issues.updateMilestone.mockResolvedValue({ data: updatedMilestone })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        name: 'v1.0 Release',
        description: 'First stable release',
      })

      const result = await repository.update(created.id, { name: 'Updated' })

      expect(octokit.rest.issues.updateMilestone).toHaveBeenCalledWith(
        expect.objectContaining({ milestone_number: 3 }),
      )
      expect(result.name).toBe('Updated')
    })

    it('tC-12: returns mapped domain Milestone', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.createMilestone.mockResolvedValue({ data: MILESTONE_OPEN })
      const updatedMilestone: GitHubMilestoneResponse = { ...MILESTONE_OPEN, description: 'New desc' }
      octokit.rest.issues.updateMilestone.mockResolvedValue({ data: updatedMilestone })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        name: 'v1.0 Release',
        description: 'First stable release',
      })

      const result = await repository.update(created.id, { description: 'New desc' })

      expect(result.description).toBe('New desc')
    })

    it('tC-13: maps API error from updateMilestone', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.createMilestone.mockResolvedValue({ data: MILESTONE_OPEN })
      octokit.rest.issues.updateMilestone.mockRejectedValue({
        response: { status: 422, data: { message: 'Validation Failed', errors: [] } },
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        name: 'v1.0 Release',
        description: 'First stable release',
      })

      await expect(repository.update(created.id, { name: 'Updated' })).rejects.toThrow(ValidationError)
    })
  })

  describe('delete', () => {
    it('tC-14: throws NotFoundError for uncached ID', async () => {
      const repository = new GitHubMilestoneRepository(createMockOctokit(), TEST_CONFIG)
      const unknownId = '00000000-0000-0000-0000-000000000000' as MilestoneId

      await expect(repository.delete(unknownId)).rejects.toThrow(NotFoundError)
    })

    it('tC-15: calls deleteMilestone with correct params', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.createMilestone.mockResolvedValue({ data: MILESTONE_OPEN })
      octokit.rest.issues.deleteMilestone.mockResolvedValue({})
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        name: 'v1.0 Release',
        description: 'First stable release',
      })

      await repository.delete(created.id)

      expect(octokit.rest.issues.deleteMilestone).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        milestone_number: 3,
      })
    })

    it('tC-16: removes ID from cache after delete', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.createMilestone.mockResolvedValue({ data: MILESTONE_OPEN })
      octokit.rest.issues.deleteMilestone.mockResolvedValue({})
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        name: 'v1.0 Release',
        description: 'First stable release',
      })

      await repository.delete(created.id)

      await expect(repository.getById(created.id)).rejects.toThrow(NotFoundError)
    })

    it('tC-17: maps API error from deleteMilestone', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.createMilestone.mockResolvedValue({ data: MILESTONE_OPEN })
      octokit.rest.issues.deleteMilestone.mockRejectedValue({
        response: { status: 403, data: { message: 'Forbidden' } },
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        name: 'v1.0 Release',
        description: 'First stable release',
      })

      await expect(repository.delete(created.id)).rejects.toThrow(AuthorizationError)
    })
  })

  describe('list', () => {
    it('tC-18: calls listMilestones with pagination params', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [MILESTONE_OPEN],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repository.list({ page: 1, limit: 20 })

      expect(octokit.rest.issues.listMilestones).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          per_page: 20,
          page: 1,
          state: 'all',
        }),
      )
      expect(result.items).toHaveLength(1)
    })

    it('tC-19: maps milestones to domain Milestones', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [MILESTONE_OPEN, MILESTONE_CLOSED],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repository.list({ page: 1, limit: 20 })

      expect(result.items).toHaveLength(2)
      expect(result.items[0]!.name).toBe('v1.0 Release')
    })

    it('tC-20: caches milestone numbers from list', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [MILESTONE_OPEN],
        headers: {},
      })
      octokit.rest.issues.getMilestone.mockResolvedValue({ data: MILESTONE_OPEN })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const listResult = await repository.list({ page: 1, limit: 20 })
      const listedMilestoneId = listResult.items[0]!.id

      const fetched = await repository.getById(listedMilestoneId)

      expect(fetched).toBeDefined()
      expect(octokit.rest.issues.getMilestone).toHaveBeenCalledWith(
        expect.objectContaining({ milestone_number: 3 }),
      )
    })

    it('tC-21: hasMore true when items.length === limit', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [MILESTONE_OPEN, MILESTONE_CLOSED],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repository.list({ page: 1, limit: 2 })

      expect(result.hasMore).toBe(true)
    })

    it('tC-22: hasMore false when items.length < limit', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [MILESTONE_OPEN],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repository.list({ page: 1, limit: 20 })

      expect(result.hasMore).toBe(false)
    })

    it('tC-23: parses Link header for total', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [MILESTONE_OPEN],
        headers: {
          link: '<https://api.github.com/repos/o/r/milestones?page=5>; rel="last"',
        },
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repository.list({ page: 1, limit: 10 })

      expect(result.total).toBe(50)
    })

    it('tC-24: computes total without Link header', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [MILESTONE_OPEN, MILESTONE_CLOSED, { ...MILESTONE_OPEN, number: 5 }],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repository.list({ page: 1, limit: 20 })

      expect(result.total).toBe(3)
    })

    it('tC-25: computes total on page 2 without Link header', async () => {
      const octokit = createMockOctokit()
      const items = [
        MILESTONE_OPEN,
        MILESTONE_CLOSED,
        { ...MILESTONE_OPEN, number: 5 },
        { ...MILESTONE_CLOSED, number: 6 },
        { ...MILESTONE_OPEN, number: 7 },
      ]
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: items,
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repository.list({ page: 2, limit: 10 })

      expect(result.total).toBe(15)
    })

    it('tC-26: passes sort params to API', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      await repository.list({ page: 1, limit: 20 }, { field: 'dueDate', direction: 'asc' })

      expect(octokit.rest.issues.listMilestones).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'due_on',
          direction: 'asc',
        }),
      )
    })

    it('tC-27: maps completeness sort field', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      await repository.list({ page: 1, limit: 20 }, { field: 'completeness', direction: 'desc' })

      expect(octokit.rest.issues.listMilestones).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'completeness',
          direction: 'desc',
        }),
      )
    })

    it('tC-28: ignores unknown sort field', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      await repository.list({ page: 1, limit: 20 }, { field: 'unknownField', direction: 'asc' })

      const calledParams = octokit.rest.issues.listMilestones.mock.calls[0]![0] as Record<string, unknown>
      expect(calledParams).not.toHaveProperty('sort')
      expect(calledParams).not.toHaveProperty('direction')
    })

    it('tC-29: always passes state:all', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      await repository.list({ page: 1, limit: 20 })

      expect(octokit.rest.issues.listMilestones).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'all',
        }),
      )
    })

    it('tC-30: maps API error from listMilestones', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockRejectedValue({
        response: { status: 403, data: { message: 'Forbidden' } },
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      await expect(repository.list({ page: 1, limit: 20 })).rejects.toThrow(AuthorizationError)
    })

    it('tC-31: returns correct page in result', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repository.list({ page: 3, limit: 10 })

      expect(result.page).toBe(3)
      expect(result.limit).toBe(10)
    })
  })

  describe('populateCache', () => {
    it('tC-32: enables getById for given ID', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.getMilestone.mockResolvedValue({ data: MILESTONE_OPEN })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const domainMilestone = toDomain(MILESTONE_OPEN, TEST_CONFIG)
      repository.populateCache(domainMilestone.id, 5)

      await repository.getById(domainMilestone.id)

      expect(octokit.rest.issues.getMilestone).toHaveBeenCalledWith(
        expect.objectContaining({ milestone_number: 5 }),
      )
    })

    it('tC-33: overwrites previous cache entry', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.getMilestone.mockResolvedValue({ data: MILESTONE_OPEN })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const domainMilestone = toDomain(MILESTONE_OPEN, TEST_CONFIG)
      repository.populateCache(domainMilestone.id, 5)
      repository.populateCache(domainMilestone.id, 7)

      await repository.getById(domainMilestone.id)

      expect(octokit.rest.issues.getMilestone).toHaveBeenCalledWith(
        expect.objectContaining({ milestone_number: 7 }),
      )
    })
  })

  describe('edge cases', () => {
    it('tC-34: empty list response', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repository.list({ page: 1, limit: 20 })

      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })

    it('tC-35: rate limit error (429)', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockRejectedValue({
        response: { status: 429, data: { message: 'rate limit' } },
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      try {
        await repository.list({ page: 1, limit: 20 })
        expect.fail('should have thrown')
      }
      catch (error) {
        expect(error).toBeInstanceOf(DomainError)
        expect((error as DomainError).code).toBe('RATE_LIMITED')
      }
    })

    it('tC-36: server error (500)', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.createMilestone.mockRejectedValue({
        response: { status: 500, data: { message: 'Internal' } },
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      try {
        await repository.create({ name: 'Test', description: 'desc' })
        expect.fail('should have thrown')
      }
      catch (error) {
        expect(error).toBeInstanceOf(DomainError)
        expect((error as DomainError).code).toBe('GITHUB_SERVER_ERROR')
      }
    })

    it('tC-37: Link header with extra params', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [MILESTONE_OPEN],
        headers: {
          link: '<https://api.github.com/repos/o/r/milestones?state=all&page=3>; rel="last"',
        },
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repository.list({ page: 1, limit: 10 })

      expect(result.total).toBe(30)
    })

    it('tC-38: sort field createdAt treated as unsupported (no sort params passed)', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      await repository.list({ page: 1, limit: 20 }, { field: 'createdAt', direction: 'desc' })

      const calledParams = octokit.rest.issues.listMilestones.mock.calls[0]![0] as Record<string, unknown>
      expect(calledParams).not.toHaveProperty('sort')
      expect(calledParams).not.toHaveProperty('direction')
    })

    it('tC-39: sort field updatedAt treated as unsupported (no sort params passed)', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      await repository.list({ page: 1, limit: 20 }, { field: 'updatedAt', direction: 'asc' })

      const calledParams = octokit.rest.issues.listMilestones.mock.calls[0]![0] as Record<string, unknown>
      expect(calledParams).not.toHaveProperty('sort')
      expect(calledParams).not.toHaveProperty('direction')
    })

    it('tC-40: milestone without metadata number skips cache', async () => {
      const octokit = createMockOctokit()
      const weirdMilestone: GitHubMilestoneResponse = {
        ...MILESTONE_OPEN,
        number: undefined as unknown as number,
      }
      octokit.rest.issues.listMilestones.mockResolvedValue({
        data: [weirdMilestone],
        headers: {},
      })
      const repository = new GitHubMilestoneRepository(octokit, TEST_CONFIG)

      const result = await repository.list({ page: 1, limit: 20 })

      // Should not throw - it gracefully handles the case
      expect(result.items).toBeDefined()
    })
  })
})
