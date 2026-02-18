import { OpenAPIHono } from '@hono/zod-openapi'
import { ConflictError, ValidationError } from '@meridian/core'
import { describe, expect, it, vi } from 'vitest'

import { createErrorHandler } from '../src/middleware/error-handler.js'
import { createMilestoneRouter } from '../src/routes/milestones.js'

const UUID1 = '00000000-0000-4000-8000-000000000001'
const FALLBACK_USER_ID = '00000000-0000-0000-0000-000000000000'

function validMilestone() {
  return {
    id: UUID1,
    name: 'Test Milestone',
    description: '',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function mockUseCase(returnValue: unknown) {
  return { execute: vi.fn().mockResolvedValue(returnValue) }
}

function mockAuditLogger() {
  return { log: vi.fn().mockResolvedValue(undefined) }
}

function createApp(deps: {
  createMilestone?: ReturnType<typeof mockUseCase>
  getMilestoneOverview?: ReturnType<typeof mockUseCase>
}) {
  const createMilestone = deps.createMilestone ?? mockUseCase({ ok: true, value: validMilestone() })
  const getMilestoneOverview = deps.getMilestoneOverview ?? mockUseCase({ ok: true, value: {} })
  const router = createMilestoneRouter({ createMilestone, getMilestoneOverview } as any)
  const app = new OpenAPIHono()
  app.onError(createErrorHandler(mockAuditLogger() as any))
  app.route('/', router)
  return { app, createMilestone }
}

describe('pOST /milestones', () => {
  it('rP-01: success returns 201 with milestone data', async () => {
    const milestone = validMilestone()
    const createMilestone = mockUseCase({ ok: true, value: milestone })
    const { app } = createApp({ createMilestone })

    const res = await app.request('/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Milestone' }),
    })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.id).toBeDefined()
    expect(body.data.name).toBe('Test Milestone')
  })

  it('rP-02: dates serialized as ISO strings', async () => {
    const milestone = validMilestone()
    const createMilestone = mockUseCase({ ok: true, value: milestone })
    const { app } = createApp({ createMilestone })

    const res = await app.request('/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Milestone' }),
    })
    const body = await res.json()

    expect(typeof body.data.createdAt).toBe('string')
    expect(typeof body.data.updatedAt).toBe('string')
  })

  it('rP-03: passes body to use-case execute', async () => {
    const createMilestone = mockUseCase({ ok: true, value: validMilestone() })
    const { app } = createApp({ createMilestone })

    await app.request('/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    })

    expect(createMilestone.execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'X' }),
      expect.anything(),
    )
  })

  it('rP-04: uses X-User-Id header when valid UUID', async () => {
    const createMilestone = mockUseCase({ ok: true, value: validMilestone() })
    const { app } = createApp({ createMilestone })

    await app.request('/milestones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': UUID1,
      },
      body: JSON.stringify({ name: 'Test Milestone' }),
    })

    expect(createMilestone.execute).toHaveBeenCalledWith(
      expect.anything(),
      UUID1,
    )
  })

  it('rP-05: falls back to zeroed UUID when X-User-Id missing', async () => {
    const createMilestone = mockUseCase({ ok: true, value: validMilestone() })
    const { app } = createApp({ createMilestone })

    await app.request('/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Milestone' }),
    })

    expect(createMilestone.execute).toHaveBeenCalledWith(
      expect.anything(),
      FALLBACK_USER_ID,
    )
  })

  it('rP-06: falls back to zeroed UUID for invalid X-User-Id', async () => {
    const createMilestone = mockUseCase({ ok: true, value: validMilestone() })
    const { app } = createApp({ createMilestone })

    await app.request('/milestones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': 'not-a-uuid',
      },
      body: JSON.stringify({ name: 'Test Milestone' }),
    })

    expect(createMilestone.execute).toHaveBeenCalledWith(
      expect.anything(),
      FALLBACK_USER_ID,
    )
  })

  it('rP-07: validation error returns 422', async () => {
    const createMilestone = mockUseCase({
      ok: false,
      error: new ValidationError('name', 'too short'),
    })
    const { app } = createApp({ createMilestone })

    const res = await app.request('/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    })
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rP-08: conflict error returns 409', async () => {
    const createMilestone = mockUseCase({
      ok: false,
      error: new ConflictError('Milestone', 'x', 'duplicate'),
    })
    const { app } = createApp({ createMilestone })

    const res = await app.request('/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    })
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error.code).toBe('CONFLICT')
  })

  it('rP-09: missing body returns 422', async () => {
    const { app } = createApp({})

    const res = await app.request('/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(422)
  })

  it('rP-10: empty name in body returns 422', async () => {
    const { app } = createApp({})

    const res = await app.request('/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })

    expect(res.status).toBe(422)
  })

  it('rP-11: response wrapped in data envelope', async () => {
    const createMilestone = mockUseCase({ ok: true, value: validMilestone() })
    const { app } = createApp({ createMilestone })

    const res = await app.request('/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Milestone' }),
    })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data).toBeDefined()
    expect(body.data.id).toBeDefined()
    expect(body.data.name).toBeDefined()
  })

  it('rP-12: success with all optional fields', async () => {
    const milestone = validMilestone()
    const createMilestone = mockUseCase({
      ok: true,
      value: { ...milestone, description: 'D', metadata: { x: 1 } },
    })
    const { app } = createApp({ createMilestone })

    const res = await app.request('/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'P', description: 'D', metadata: { x: 1 } }),
    })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.description).toBeDefined()
    expect(body.data.metadata).toBeDefined()
  })

  // Edge case
  it('eP-04: name at max 200 chars accepted', async () => {
    const milestone = validMilestone()
    const createMilestone = mockUseCase({
      ok: true,
      value: { ...milestone, name: 'a'.repeat(200) },
    })
    const { app } = createApp({ createMilestone })

    const res = await app.request('/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'a'.repeat(200) }),
    })

    expect(res.status).toBe(201)
  })
})
