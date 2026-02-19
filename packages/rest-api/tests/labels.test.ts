import { OpenAPIHono } from '@hono/zod-openapi'
import { describe, expect, it, vi } from 'vitest'

import { createLabelRouter } from '../src/routes/labels.js'

const UUID1 = '00000000-0000-4000-8000-000000000001'
const UUID2 = '00000000-0000-4000-8000-000000000002'
const TAG_ID1 = '00000000-0000-4000-8000-000000000010'
const TAG_ID2 = '00000000-0000-4000-8000-000000000011'

function makeIssueWithTags(tags: Array<{ id: string, name: string, color: string | null }>) {
  return {
    id: UUID1,
    milestoneId: UUID2,
    title: 'Issue',
    description: '',
    status: 'open',
    priority: 'normal',
    assigneeIds: [],
    tags,
    dueDate: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function mockIssueRepository() {
  return {
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn().mockResolvedValue({ items: [], total: 0, hasMore: false, page: 1, limit: 20 }),
  }
}

function createApp(deps: {
  issueRepository?: ReturnType<typeof mockIssueRepository>
}) {
  const issueRepository = deps.issueRepository ?? mockIssueRepository()
  const router = createLabelRouter({ issueRepository } as any)
  const app = new OpenAPIHono()
  app.route('/', router)
  return { app, issueRepository }
}

describe('labelRoutes', () => {
  describe('gET /labels', () => {
    it('tC-35: list labels aggregates from issues', async () => {
      const tag1 = { id: TAG_ID1, name: 'bug', color: '#ff0000' }
      const tag2 = { id: TAG_ID2, name: 'feature', color: '#00ff00' }
      const issueRepo = mockIssueRepository()
      issueRepo.list.mockResolvedValue({
        items: [
          makeIssueWithTags([tag1]),
          makeIssueWithTags([tag1, tag2]),
        ],
        total: 2,
        hasMore: false,
        page: 1,
        limit: 100,
      })
      const { app } = createApp({ issueRepository: issueRepo })

      const res = await app.request('/labels')
      const body = await res.json()

      expect(res.status).toBe(200)
      // Should only contain unique tags
      const names = body.data.map((t: any) => t.name)
      expect(names).toContain('bug')
      expect(names).toContain('feature')
    })

    it('tC-36: list labels empty', async () => {
      const issueRepo = mockIssueRepository()
      issueRepo.list.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
        page: 1,
        limit: 100,
      })
      const { app } = createApp({ issueRepository: issueRepo })

      const res = await app.request('/labels')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toEqual([])
    })

    it('tC-37: list labels with milestoneId filter', async () => {
      const issueRepo = mockIssueRepository()
      issueRepo.list.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
        page: 1,
        limit: 100,
      })
      const { app } = createApp({ issueRepository: issueRepo })

      const res = await app.request(`/labels?milestoneId=${UUID2}`)

      expect(res.status).toBe(200)
      expect(issueRepo.list).toHaveBeenCalledWith(
        expect.objectContaining({ milestoneId: UUID2 }),
        expect.anything(),
      )
    })

    it('tC-38: list labels deduplicates by tag id', async () => {
      const sharedTag = { id: TAG_ID1, name: 'bug', color: '#ff0000' }
      const issueRepo = mockIssueRepository()
      issueRepo.list.mockResolvedValue({
        items: [
          makeIssueWithTags([sharedTag]),
          makeIssueWithTags([sharedTag]),
        ],
        total: 2,
        hasMore: false,
        page: 1,
        limit: 100,
      })
      const { app } = createApp({ issueRepository: issueRepo })

      const res = await app.request('/labels')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(1)
    })

    it('tC-39: list labels invalid milestoneId', async () => {
      const { app } = createApp({})

      const res = await app.request('/labels?milestoneId=bad')
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('tC-48: label route fetches with limit 100', async () => {
      const issueRepo = mockIssueRepository()
      issueRepo.list.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
        page: 1,
        limit: 100,
      })
      const { app } = createApp({ issueRepository: issueRepo })

      await app.request('/labels')

      expect(issueRepo.list).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ page: 1, limit: 100 }),
      )
    })

    it('l-07: tag color nullable', async () => {
      const tag = { id: TAG_ID1, name: 'colorless', color: null }
      const issueRepo = mockIssueRepository()
      issueRepo.list.mockResolvedValue({
        items: [makeIssueWithTags([tag])],
        total: 1,
        hasMore: false,
        page: 1,
        limit: 100,
      })
      const { app } = createApp({ issueRepository: issueRepo })

      const res = await app.request('/labels')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data[0].color).toBeNull()
    })

    it('e-16: pagination across pages calls list twice when hasMore is true', async () => {
      const tag1 = { id: TAG_ID1, name: 'bug', color: '#ff0000' }
      const tag2 = { id: TAG_ID2, name: 'feature', color: '#00ff00' }
      const issueRepo = mockIssueRepository()

      // First call returns hasMore=true, second call returns hasMore=false
      issueRepo.list
        .mockResolvedValueOnce({
          items: [makeIssueWithTags([tag1])],
          total: 2,
          hasMore: true,
          page: 1,
          limit: 100,
        })
        .mockResolvedValueOnce({
          items: [makeIssueWithTags([tag2])],
          total: 2,
          hasMore: false,
          page: 2,
          limit: 100,
        })
      const { app } = createApp({ issueRepository: issueRepo })

      const res = await app.request('/labels')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(issueRepo.list).toHaveBeenCalledTimes(2)
      const names = body.data.map((t: any) => t.name)
      expect(names).toContain('bug')
      expect(names).toContain('feature')
    })
  })
})
