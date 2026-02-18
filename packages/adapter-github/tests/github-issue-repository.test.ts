import type { IssueId, MilestoneId } from '@meridian/core'

import type { GitHubIssueResponse } from '../src/mappers/issue-mapper.js'
import { AuthorizationError, NotFoundError, ValidationError } from '@meridian/core'

import { describe, expect, it, vi } from 'vitest'
import { GitHubIssueRepository } from '../src/github-issue-repository.js'
import { toDomain } from '../src/mappers/issue-mapper.js'
import { GITHUB_ISSUE_CLOSED, GITHUB_ISSUE_OPEN } from './fixtures/github-responses.js'

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
        create: vi.fn(),
        get: vi.fn(),
        update: vi.fn(),
        listForRepo: vi.fn(),
      },
      search: {
        issuesAndPullRequests: vi.fn(),
      },
    },
  }
}

describe('gitHubIssueRepository', () => {
  describe('create', () => {
    it('gR-01: create calls octokit.rest.issues.create', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.create.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repository.create({
        milestoneId: TEST_MILESTONE_ID,
        title: 'Fix login button',
      })

      expect(result.title).toBe('Fix login button')
      expect(result.status).toBe('open')
      expect(result.priority).toBe('high')
      expect(octokit.rest.issues.create).toHaveBeenCalled()
    })

    it('gR-02: create validates input via schema', async () => {
      const octokit = createMockOctokit()
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await expect(repository.create({
        milestoneId: TEST_MILESTONE_ID,
        title: '',
      })).rejects.toThrow()
    })

    it('gR-03: create caches issue number', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.create.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      octokit.rest.issues.get.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        milestoneId: TEST_MILESTONE_ID,
        title: 'Fix login button',
      })

      const fetched = await repository.getById(created.id)
      expect(fetched.title).toBe('Fix login button')
    })

    it('gR-04: create maps API error', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.create.mockRejectedValue({
        response: { status: 422, data: { message: 'Validation Failed', errors: [{ field: 'title', message: 'is required' }] } },
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await expect(repository.create({
        milestoneId: TEST_MILESTONE_ID,
        title: 'Test',
      })).rejects.toThrow(ValidationError)
    })
  })

  describe('getById', () => {
    it('gR-05: throws NotFoundError for uncached id', async () => {
      const repository = new GitHubIssueRepository(createMockOctokit(), TEST_CONFIG)
      const unknownId = '00000000-0000-0000-0000-000000000000' as IssueId

      await expect(repository.getById(unknownId)).rejects.toThrow(NotFoundError)
    })

    it('gR-06: fetches via octokit after populateCache', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.get.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      repository.populateCache(domainIssue.id, 42)

      const result = await repository.getById(domainIssue.id)

      expect(result.title).toBe('Fix login button')
      expect(octokit.rest.issues.get).toHaveBeenCalledWith(
        expect.objectContaining({ issue_number: 42 }),
      )
    })

    it('gR-07: maps API error', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.get.mockRejectedValue({
        response: { status: 404, data: { message: 'Not Found' } },
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      repository.populateCache(domainIssue.id, 42)

      await expect(repository.getById(domainIssue.id)).rejects.toThrow(NotFoundError)
    })
  })

  describe('update', () => {
    it('gR-08: throws NotFoundError for uncached id', async () => {
      const repository = new GitHubIssueRepository(createMockOctokit(), TEST_CONFIG)
      const unknownId = '00000000-0000-0000-0000-000000000000' as IssueId

      await expect(repository.update(unknownId, { title: 'Nope' })).rejects.toThrow(NotFoundError)
    })

    it('gR-09: update fetches current then patches', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.create.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      octokit.rest.issues.get.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      const updatedResponse: GitHubIssueResponse = {
        ...GITHUB_ISSUE_OPEN,
        title: 'Updated title',
      }
      octokit.rest.issues.update.mockResolvedValue({ data: updatedResponse })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        milestoneId: TEST_MILESTONE_ID,
        title: 'Fix login button',
      })

      await repository.update(created.id, { title: 'Updated title' })

      expect(octokit.rest.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({ issue_number: 42 }),
      )
    })

    it('gR-10: update returns mapped result', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.create.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      const updatedResponse: GitHubIssueResponse = {
        ...GITHUB_ISSUE_OPEN,
        title: 'Updated title',
      }
      octokit.rest.issues.get.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      octokit.rest.issues.update.mockResolvedValue({ data: updatedResponse })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        milestoneId: TEST_MILESTONE_ID,
        title: 'Fix login button',
      })

      const result = await repository.update(created.id, { title: 'Updated title' })

      expect(result.title).toBe('Updated title')
    })
  })

  describe('delete', () => {
    it('gR-11: throws NotFoundError for uncached id', async () => {
      const repository = new GitHubIssueRepository(createMockOctokit(), TEST_CONFIG)
      const unknownId = '00000000-0000-0000-0000-000000000000' as IssueId

      await expect(repository.delete(unknownId)).rejects.toThrow(NotFoundError)
    })

    it('gR-12: closes issue with deleted label', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.create.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      octokit.rest.issues.get.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      octokit.rest.issues.update.mockResolvedValue({ data: { ...GITHUB_ISSUE_OPEN, state: 'closed' } })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        milestoneId: TEST_MILESTONE_ID,
        title: 'Fix login button',
      })

      await repository.delete(created.id)

      expect(octokit.rest.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'closed',
          labels: expect.arrayContaining(['deleted']),
        }),
      )
    })

    it('gR-13: removes id from cache', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.create.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      octokit.rest.issues.get.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      octokit.rest.issues.update.mockResolvedValue({ data: { ...GITHUB_ISSUE_OPEN, state: 'closed' } })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        milestoneId: TEST_MILESTONE_ID,
        title: 'Fix login button',
      })

      await repository.delete(created.id)

      await expect(repository.getById(created.id)).rejects.toThrow(NotFoundError)
    })
  })

  describe('list', () => {
    it('gR-14: calls listForRepo with pagination', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [GITHUB_ISSUE_OPEN],
        headers: {},
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repository.list({}, { page: 1, limit: 20 })

      expect(result.items).toHaveLength(1)
    })

    it('gR-15: filters pull_requests', async () => {
      const octokit = createMockOctokit()
      const issueWithPR = { ...GITHUB_ISSUE_CLOSED, pull_request: {} }
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [GITHUB_ISSUE_OPEN, issueWithPR],
        headers: {},
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repository.list({}, { page: 1, limit: 20 })

      expect(result.items).toHaveLength(1)
    })

    it('gR-16: maps status filter to GitHub state', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [GITHUB_ISSUE_CLOSED],
        headers: {},
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await repository.list({ status: 'closed' }, { page: 1, limit: 20 })

      expect(octokit.rest.issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'closed',
        }),
      )
    })

    it('gR-17: maps in_progress to state:open + label', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [],
        headers: {},
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await repository.list({ status: 'in_progress' }, { page: 1, limit: 20 })

      expect(octokit.rest.issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'open',
          labels: expect.stringContaining('status:in-progress'),
        }),
      )
    })

    it('gR-18: maps no status to state:all', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [],
        headers: {},
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await repository.list({}, { page: 1, limit: 20 })

      expect(octokit.rest.issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'all',
        }),
      )
    })

    it('gR-19: maps priority filter to label', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [],
        headers: {},
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await repository.list({ priority: 'high' }, { page: 1, limit: 20 })

      expect(octokit.rest.issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: expect.stringContaining('priority:high'),
        }),
      )
    })

    it('gR-20: maps assigneeId filter', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [],
        headers: {},
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await repository.list({ assigneeId: 'user1' }, { page: 1, limit: 20 })

      expect(octokit.rest.issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee: 'user1',
        }),
      )
    })

    it('gR-21: maps sort createdAt to created', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [],
        headers: {},
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await repository.list({}, { page: 1, limit: 20 }, { field: 'createdAt', direction: 'desc' })

      expect(octokit.rest.issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'created',
          direction: 'desc',
        }),
      )
    })

    it('gR-22: hasMore true when items.length === limit', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [GITHUB_ISSUE_OPEN, GITHUB_ISSUE_CLOSED],
        headers: {},
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repository.list({}, { page: 1, limit: 2 })

      expect(result.hasMore).toBe(true)
    })

    it('gR-23: hasMore false when items.length < limit', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [GITHUB_ISSUE_OPEN],
        headers: {},
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repository.list({}, { page: 1, limit: 20 })

      expect(result.hasMore).toBe(false)
    })

    it('gR-24: parses Link header for total', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [GITHUB_ISSUE_OPEN, GITHUB_ISSUE_CLOSED],
        headers: {
          link: '<https://api.github.com/repos/owner/repo/issues?page=5>; rel="last", <https://api.github.com/repos/owner/repo/issues?page=2>; rel="next"',
        },
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repository.list({}, { page: 1, limit: 2 })

      expect(result.total).toBe(10)
    })

    it('gR-25: without Link header computes total', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [GITHUB_ISSUE_OPEN, GITHUB_ISSUE_CLOSED, { ...GITHUB_ISSUE_OPEN, number: 100 }],
        headers: {},
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const result = await repository.list({}, { page: 1, limit: 20 })

      expect(result.total).toBe(3)
    })

    it('gR-26: caches issue numbers', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [GITHUB_ISSUE_OPEN],
        headers: {},
      })
      octokit.rest.issues.get.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const listResult = await repository.list({}, { page: 1, limit: 20 })
      const listedIssueId = listResult.items[0]!.id

      const getResult = await repository.getById(listedIssueId)
      expect(getResult.title).toBe('Fix login button')
    })

    it('gR-27: maps API error', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.listForRepo.mockRejectedValue({
        response: { status: 403, data: { message: 'Forbidden' } },
      })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      await expect(repository.list({}, { page: 1, limit: 20 })).rejects.toThrow(AuthorizationError)
    })
  })

  describe('populateCache', () => {
    it('gR-28: populateCache enables getById', async () => {
      const octokit = createMockOctokit()
      octokit.rest.issues.get.mockResolvedValue({ data: GITHUB_ISSUE_OPEN })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const domainIssue = toDomain(GITHUB_ISSUE_OPEN, TEST_CONFIG)
      repository.populateCache(domainIssue.id, 42)

      await repository.getById(domainIssue.id)

      expect(octokit.rest.issues.get).toHaveBeenCalledWith(
        expect.objectContaining({ issue_number: 42 }),
      )
    })
  })

  describe('edge cases', () => {
    it('eC-06: delete preserves existing labels', async () => {
      const octokit = createMockOctokit()
      const issueWithLabels: GitHubIssueResponse = {
        ...GITHUB_ISSUE_OPEN,
        labels: [
          { id: 1, name: 'bug', color: 'fc2929' },
          { id: 2, name: 'feature', color: 'a2eeef' },
        ],
      }
      octokit.rest.issues.create.mockResolvedValue({ data: issueWithLabels })
      octokit.rest.issues.get.mockResolvedValue({ data: issueWithLabels })
      octokit.rest.issues.update.mockResolvedValue({ data: { ...issueWithLabels, state: 'closed' } })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        milestoneId: TEST_MILESTONE_ID,
        title: 'Fix login button',
      })

      await repository.delete(created.id)

      expect(octokit.rest.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: expect.arrayContaining(['bug', 'feature', 'deleted']),
        }),
      )
    })

    it('eC-07: delete does not duplicate deleted', async () => {
      const octokit = createMockOctokit()
      const issueWithDeletedLabel: GitHubIssueResponse = {
        ...GITHUB_ISSUE_OPEN,
        labels: [
          { id: 1, name: 'deleted', color: null },
        ],
      }
      octokit.rest.issues.create.mockResolvedValue({ data: issueWithDeletedLabel })
      octokit.rest.issues.get.mockResolvedValue({ data: issueWithDeletedLabel })
      octokit.rest.issues.update.mockResolvedValue({ data: { ...issueWithDeletedLabel, state: 'closed' } })
      const repository = new GitHubIssueRepository(octokit, TEST_CONFIG)

      const created = await repository.create({
        milestoneId: TEST_MILESTONE_ID,
        title: 'Fix login button',
      })

      await repository.delete(created.id)

      const calledLabels = octokit.rest.issues.update.mock.calls[0]![0].labels as string[]
      const deletedCount = calledLabels.filter((l: string) => l === 'deleted').length
      expect(deletedCount).toBe(1)
    })
  })
})
