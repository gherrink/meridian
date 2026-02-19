import { OpenAPIHono } from '@hono/zod-openapi'
import { NotFoundError, ValidationError } from '@meridian/core'
import { describe, expect, it, vi } from 'vitest'

import { createErrorHandler } from '../src/middleware/error-handler.js'
import { createIssueRouter } from '../src/routes/issues.js'

const UUID1 = '00000000-0000-4000-8000-000000000001'
const UUID2 = '00000000-0000-4000-8000-000000000002'
const FALLBACK_USER_ID = '00000000-0000-0000-0000-000000000000'

function validIssue(overrides?: Record<string, unknown>) {
  return {
    id: UUID1,
    milestoneId: UUID2,
    title: 'Test Issue',
    description: '',
    state: 'open',
    status: 'backlog',
    priority: 'normal',
    parentId: null,
    assigneeIds: [],
    tags: [],
    dueDate: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function mockUseCase(returnValue: unknown) {
  return { execute: vi.fn().mockResolvedValue(returnValue) }
}

function mockIssueRepository() {
  return {
    create: vi.fn(),
    getById: vi.fn().mockResolvedValue(validIssue()),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn().mockResolvedValue({ items: [], total: 0, hasMore: false, page: 1, limit: 20 }),
  }
}

function mockAuditLogger() {
  return { log: vi.fn().mockResolvedValue(undefined) }
}

function createApp(deps: {
  createIssue?: ReturnType<typeof mockUseCase>
  listIssues?: ReturnType<typeof mockUseCase>
  updateIssue?: ReturnType<typeof mockUseCase>
  issueRepository?: ReturnType<typeof mockIssueRepository>
}) {
  const router = createIssueRouter({
    createIssue: deps.createIssue ?? mockUseCase({ ok: true, value: validIssue() }),
    listIssues: deps.listIssues ?? mockUseCase({ ok: true, value: { items: [], total: 0, hasMore: false, page: 1, limit: 20 } }),
    updateIssue: deps.updateIssue ?? mockUseCase({ ok: true, value: validIssue() }),
    issueRepository: deps.issueRepository ?? mockIssueRepository(),
  } as any)
  const app = new OpenAPIHono()
  app.onError(createErrorHandler(mockAuditLogger() as any))
  app.route('/', router)
  return app
}

describe('issueRoutes', () => {
  describe('pOST /issues', () => {
    it('tC-01: create issue success', async () => {
      const issue = validIssue()
      const createIssue = mockUseCase({ ok: true, value: issue })
      const app = createApp({ createIssue })

      const res = await app.request('/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId: UUID2, title: 'Test Issue' }),
      })
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(body.data.id).toBe(UUID1)
      expect(body.data.title).toBe('Test Issue')
      expect(typeof body.data.createdAt).toBe('string')
      expect(typeof body.data.updatedAt).toBe('string')
    })

    it('tC-02: create issue with all fields', async () => {
      const dueDate = new Date('2026-06-01T00:00:00.000Z')
      const tags = [{ id: UUID1, name: 'bug', color: null }]
      const assigneeIds = [UUID1]
      const metadata = { key: 'value' }
      const issue = validIssue({ dueDate, tags, assigneeIds, metadata })
      const createIssue = mockUseCase({ ok: true, value: issue })
      const app = createApp({ createIssue })

      const res = await app.request('/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: UUID2,
          title: 'Test Issue',
          dueDate: '2026-06-01T00:00:00.000Z',
          tags,
          assigneeIds,
          metadata,
        }),
      })
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(body.data.tags).toBeDefined()
      expect(body.data.assigneeIds).toBeDefined()
      expect(body.data.metadata).toBeDefined()
      expect(body.data.dueDate).toBeDefined()
    })

    it('tC-03: create issue validation error from use case', async () => {
      const createIssue = mockUseCase({
        ok: false,
        error: new ValidationError('title', 'too short'),
      })
      const app = createApp({ createIssue })

      const res = await app.request('/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId: UUID2, title: 'X' }),
      })
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('tC-04: create issue missing title', async () => {
      const app = createApp({})

      const res = await app.request('/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId: UUID2 }),
      })
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('tC-05: create issue empty title', async () => {
      const app = createApp({})

      const res = await app.request('/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId: UUID2, title: '' }),
      })
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('tC-06: create issue invalid milestoneId', async () => {
      const app = createApp({})

      const res = await app.request('/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId: 'not-a-uuid', title: 'X' }),
      })
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('tC-07: create issue defaults', async () => {
      const issue = validIssue()
      const createIssue = mockUseCase({ ok: true, value: issue })
      const app = createApp({ createIssue })

      const res = await app.request('/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId: UUID2, title: 'Test Issue' }),
      })
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(body.data.state).toBe('open')
      expect(body.data.status).toBe('backlog')
      expect(body.data.priority).toBe('normal')
      expect(body.data.assigneeIds).toEqual([])
      expect(body.data.tags).toEqual([])
      expect(body.data.description).toBe('')
    })

    it('tC-08: create issue X-User-Id header', async () => {
      const createIssue = mockUseCase({ ok: true, value: validIssue() })
      const app = createApp({ createIssue })
      const userId = '00000000-0000-4000-8000-000000000099'

      const res = await app.request('/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({ milestoneId: UUID2, title: 'Test Issue' }),
      })

      expect(res.status).toBe(201)
      expect(createIssue.execute).toHaveBeenCalledWith(
        expect.anything(),
        userId,
      )
    })

    it('tC-09: create issue no X-User-Id header', async () => {
      const createIssue = mockUseCase({ ok: true, value: validIssue() })
      const app = createApp({ createIssue })

      const res = await app.request('/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId: UUID2, title: 'Test Issue' }),
      })

      expect(res.status).toBe(201)
      expect(createIssue.execute).toHaveBeenCalledWith(
        expect.anything(),
        FALLBACK_USER_ID,
      )
    })
  })

  describe('gET /issues', () => {
    it('tC-10: list issues default pagination', async () => {
      const items = [validIssue()]
      const listIssues = mockUseCase({
        ok: true,
        value: { items, total: 1, hasMore: false, page: 1, limit: 20 },
      })
      const app = createApp({ listIssues })

      const res = await app.request('/issues')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.pagination.page).toBe(1)
      expect(body.pagination.limit).toBe(20)
    })

    it('tC-11: list issues with filters', async () => {
      const listIssues = mockUseCase({
        ok: true,
        value: { items: [], total: 0, hasMore: false, page: 1, limit: 20 },
      })
      const app = createApp({ listIssues })

      const res = await app.request('/issues?status=open&priority=high')

      expect(res.status).toBe(200)
      expect(listIssues.execute).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'open', priority: 'high' }),
        expect.anything(),
      )
    })

    it('tC-12: list issues custom pagination', async () => {
      const listIssues = mockUseCase({
        ok: true,
        value: { items: [], total: 50, hasMore: true, page: 2, limit: 10 },
      })
      const app = createApp({ listIssues })

      const res = await app.request('/issues?page=2&limit=10')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.pagination.page).toBe(2)
      expect(body.pagination.limit).toBe(10)
    })

    it('tC-13: list issues empty result', async () => {
      const listIssues = mockUseCase({
        ok: true,
        value: { items: [], total: 0, hasMore: false, page: 1, limit: 20 },
      })
      const app = createApp({ listIssues })

      const res = await app.request('/issues')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toEqual([])
      expect(body.pagination.total).toBe(0)
    })

    it('tC-14: list issues serializes dates', async () => {
      const now = new Date()
      const listIssues = mockUseCase({
        ok: true,
        value: { items: [validIssue({ createdAt: now, updatedAt: now })], total: 1, hasMore: false, page: 1, limit: 20 },
      })
      const app = createApp({ listIssues })

      const res = await app.request('/issues')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(typeof body.data[0].createdAt).toBe('string')
      expect(typeof body.data[0].updatedAt).toBe('string')
    })

    it('tC-15: list issues invalid page', async () => {
      const app = createApp({})

      const res = await app.request('/issues?page=-1')
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('tC-16: list issues limit exceeds max', async () => {
      const app = createApp({})

      const res = await app.request('/issues?limit=101')
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('gET /issues/:id', () => {
    it('tC-17: get issue by id', async () => {
      const issue = validIssue()
      const issueRepository = mockIssueRepository()
      issueRepository.getById.mockResolvedValue(issue)
      const app = createApp({ issueRepository })

      const res = await app.request(`/issues/${UUID1}`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.id).toBe(UUID1)
      expect(body.data.title).toBe('Test Issue')
    })

    it('tC-18: get issue not found', async () => {
      const issueRepository = mockIssueRepository()
      issueRepository.getById.mockRejectedValue(new NotFoundError('Issue', UUID1))
      const app = createApp({ issueRepository })

      const res = await app.request(`/issues/${UUID1}`)
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.error.code).toBe('NOT_FOUND')
    })

    it('tC-19: get issue invalid id format', async () => {
      const app = createApp({})

      const res = await app.request('/issues/not-a-uuid')
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('pATCH /issues/:id', () => {
    it('tC-20: update issue success', async () => {
      const updated = validIssue({ title: 'Updated' })
      const updateIssue = mockUseCase({ ok: true, value: updated })
      const app = createApp({ updateIssue })

      const res = await app.request(`/issues/${UUID1}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.title).toBe('Updated')
    })

    it('tC-21: update issue not found', async () => {
      const updateIssue = mockUseCase({
        ok: false,
        error: new NotFoundError('Issue', UUID1),
      })
      const app = createApp({ updateIssue })

      const res = await app.request(`/issues/${UUID1}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      })
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.error.code).toBe('NOT_FOUND')
    })

    it('tC-22: update issue validation error', async () => {
      const updateIssue = mockUseCase({
        ok: false,
        error: new ValidationError('title', 'invalid'),
      })
      const app = createApp({ updateIssue })

      const res = await app.request(`/issues/${UUID1}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'X' }),
      })

      expect(res.status).toBe(422)
    })

    it('tC-23: update issue invalid id', async () => {
      const app = createApp({})

      const res = await app.request('/issues/bad-id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      })
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('tC-24: update issue dueDate null clears', async () => {
      const updated = validIssue({ dueDate: null })
      const updateIssue = mockUseCase({ ok: true, value: updated })
      const app = createApp({ updateIssue })

      const res = await app.request(`/issues/${UUID1}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: null }),
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.dueDate).toBeNull()
    })

    it('tC-25: update issue with X-User-Id', async () => {
      const updateIssue = mockUseCase({ ok: true, value: validIssue() })
      const app = createApp({ updateIssue })
      const userId = '00000000-0000-4000-8000-000000000099'

      await app.request(`/issues/${UUID1}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({ title: 'Updated' }),
      })

      expect(updateIssue.execute).toHaveBeenCalledWith(
        UUID1,
        expect.anything(),
        userId,
      )
    })
  })

  describe('edge cases', () => {
    it('tC-45: issue dueDate serialization (non-null)', async () => {
      const dueDate = new Date('2026-06-01T00:00:00.000Z')
      const issue = validIssue({ dueDate })
      const createIssue = mockUseCase({ ok: true, value: issue })
      const app = createApp({ createIssue })

      const res = await app.request('/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId: UUID2, title: 'Test', dueDate: '2026-06-01T00:00:00.000Z' }),
      })
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(typeof body.data.dueDate).toBe('string')
      expect(body.data.dueDate).toBe('2026-06-01T00:00:00.000Z')
    })

    it('tC-46: issue dueDate serialization (null)', async () => {
      const issue = validIssue({ dueDate: null })
      const createIssue = mockUseCase({ ok: true, value: issue })
      const app = createApp({ createIssue })

      const res = await app.request('/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId: UUID2, title: 'Test' }),
      })
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(body.data.dueDate).toBeNull()
    })

    it('tC-47: list issues coerces string page/limit', async () => {
      const listIssues = mockUseCase({
        ok: true,
        value: { items: [], total: 0, hasMore: false, page: 2, limit: 10 },
      })
      const app = createApp({ listIssues })

      const res = await app.request('/issues?page=2&limit=10')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.pagination.page).toBe(2)
      expect(body.pagination.limit).toBe(10)
    })

    it('tC-49: content-type header on POST', async () => {
      const app = createApp({})

      const res = await app.request('/issues', {
        method: 'POST',
        body: 'not json',
      })

      expect([400, 422]).toContain(res.status)
    })
  })
})
