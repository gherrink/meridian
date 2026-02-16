import { OpenAPIHono } from '@hono/zod-openapi'
import { describe, expect, it, vi } from 'vitest'

import { createCommentRouter } from '../src/routes/comments.js'

const UUID1 = '00000000-0000-4000-8000-000000000001'
const UUID2 = '00000000-0000-4000-8000-000000000002'
const UUID3 = '00000000-0000-4000-8000-000000000003'

function validComment(overrides?: Record<string, unknown>) {
  return {
    id: UUID1,
    body: 'A comment',
    authorId: UUID2,
    issueId: UUID3,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function mockCommentRepository() {
  return {
    create: vi.fn().mockResolvedValue(validComment()),
    getByIssueId: vi.fn().mockResolvedValue({ items: [], total: 0, hasMore: false, page: 1, limit: 20 }),
    update: vi.fn(),
    delete: vi.fn(),
  }
}

function createApp(deps: {
  commentRepository?: ReturnType<typeof mockCommentRepository>
}) {
  const commentRepository = deps.commentRepository ?? mockCommentRepository()
  const router = createCommentRouter({ commentRepository } as any)
  const app = new OpenAPIHono()
  app.route('/', router)
  return { app, commentRepository }
}

describe('commentRoutes', () => {
  describe('pOST /issues/:id/comments', () => {
    it('tC-26: add comment success', async () => {
      const comment = validComment()
      const commentRepo = mockCommentRepository()
      commentRepo.create.mockResolvedValue(comment)
      const { app } = createApp({ commentRepository: commentRepo })

      const res = await app.request(`/issues/${UUID3}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: 'A comment', authorId: UUID2 }),
      })
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(body.data.body).toBe('A comment')
      expect(body.data.authorId).toBe(UUID2)
      expect(typeof body.data.createdAt).toBe('string')
      expect(typeof body.data.updatedAt).toBe('string')
    })

    it('tC-27: add comment missing body', async () => {
      const { app } = createApp({})

      const res = await app.request(`/issues/${UUID3}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: UUID2 }),
      })
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('tC-28: add comment empty body', async () => {
      const { app } = createApp({})

      const res = await app.request(`/issues/${UUID3}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: '', authorId: UUID2 }),
      })
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('tC-29: add comment invalid authorId', async () => {
      const { app } = createApp({})

      const res = await app.request(`/issues/${UUID3}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: 'x', authorId: 'bad' }),
      })
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('tC-30: add comment invalid issue id param', async () => {
      const { app } = createApp({})

      const res = await app.request('/issues/not-uuid/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: 'x', authorId: UUID2 }),
      })
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('gET /issues/:id/comments', () => {
    it('tC-31: list comments default pagination', async () => {
      const commentRepo = mockCommentRepository()
      commentRepo.getByIssueId.mockResolvedValue({
        items: [validComment()],
        total: 1,
        hasMore: false,
        page: 1,
        limit: 20,
      })
      const { app } = createApp({ commentRepository: commentRepo })

      const res = await app.request(`/issues/${UUID3}/comments`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.pagination).toBeDefined()
      expect(body.pagination.page).toBe(1)
      expect(body.pagination.limit).toBe(20)
    })

    it('tC-32: list comments custom pagination', async () => {
      const commentRepo = mockCommentRepository()
      commentRepo.getByIssueId.mockResolvedValue({
        items: [],
        total: 50,
        hasMore: true,
        page: 3,
        limit: 5,
      })
      const { app } = createApp({ commentRepository: commentRepo })

      const res = await app.request(`/issues/${UUID3}/comments?page=3&limit=5`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.pagination.page).toBe(3)
      expect(body.pagination.limit).toBe(5)
    })

    it('tC-33: list comments empty', async () => {
      const commentRepo = mockCommentRepository()
      commentRepo.getByIssueId.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
        page: 1,
        limit: 20,
      })
      const { app } = createApp({ commentRepository: commentRepo })

      const res = await app.request(`/issues/${UUID3}/comments`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toEqual([])
      expect(body.pagination.total).toBe(0)
    })

    it('tC-34: list comments serializes dates', async () => {
      const now = new Date()
      const commentRepo = mockCommentRepository()
      commentRepo.getByIssueId.mockResolvedValue({
        items: [validComment({ createdAt: now, updatedAt: now })],
        total: 1,
        hasMore: false,
        page: 1,
        limit: 20,
      })
      const { app } = createApp({ commentRepository: commentRepo })

      const res = await app.request(`/issues/${UUID3}/comments`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(typeof body.data[0].createdAt).toBe('string')
      expect(typeof body.data[0].updatedAt).toBe('string')
    })
  })
})
