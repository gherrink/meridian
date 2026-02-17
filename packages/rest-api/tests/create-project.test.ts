import { OpenAPIHono } from '@hono/zod-openapi'
import { ConflictError, ValidationError } from '@meridian/core'
import { describe, expect, it, vi } from 'vitest'

import { createErrorHandler } from '../src/middleware/error-handler.js'
import { createProjectRouter } from '../src/routes/projects.js'

const UUID1 = '00000000-0000-4000-8000-000000000001'
const FALLBACK_USER_ID = '00000000-0000-0000-0000-000000000000'

function validProject() {
  return {
    id: UUID1,
    name: 'Test Project',
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
  createProject?: ReturnType<typeof mockUseCase>
  getProjectOverview?: ReturnType<typeof mockUseCase>
}) {
  const createProject = deps.createProject ?? mockUseCase({ ok: true, value: validProject() })
  const getProjectOverview = deps.getProjectOverview ?? mockUseCase({ ok: true, value: {} })
  const router = createProjectRouter({ createProject, getProjectOverview } as any)
  const app = new OpenAPIHono()
  app.onError(createErrorHandler(mockAuditLogger() as any))
  app.route('/', router)
  return { app, createProject }
}

describe('pOST /projects', () => {
  it('rP-01: success returns 201 with project data', async () => {
    const project = validProject()
    const createProject = mockUseCase({ ok: true, value: project })
    const { app } = createApp({ createProject })

    const res = await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Project' }),
    })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.id).toBeDefined()
    expect(body.data.name).toBe('Test Project')
  })

  it('rP-02: dates serialized as ISO strings', async () => {
    const project = validProject()
    const createProject = mockUseCase({ ok: true, value: project })
    const { app } = createApp({ createProject })

    const res = await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Project' }),
    })
    const body = await res.json()

    expect(typeof body.data.createdAt).toBe('string')
    expect(typeof body.data.updatedAt).toBe('string')
  })

  it('rP-03: passes body to use-case execute', async () => {
    const createProject = mockUseCase({ ok: true, value: validProject() })
    const { app } = createApp({ createProject })

    await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    })

    expect(createProject.execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'X' }),
      expect.anything(),
    )
  })

  it('rP-04: uses X-User-Id header when valid UUID', async () => {
    const createProject = mockUseCase({ ok: true, value: validProject() })
    const { app } = createApp({ createProject })

    await app.request('/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': UUID1,
      },
      body: JSON.stringify({ name: 'Test Project' }),
    })

    expect(createProject.execute).toHaveBeenCalledWith(
      expect.anything(),
      UUID1,
    )
  })

  it('rP-05: falls back to zeroed UUID when X-User-Id missing', async () => {
    const createProject = mockUseCase({ ok: true, value: validProject() })
    const { app } = createApp({ createProject })

    await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Project' }),
    })

    expect(createProject.execute).toHaveBeenCalledWith(
      expect.anything(),
      FALLBACK_USER_ID,
    )
  })

  it('rP-06: falls back to zeroed UUID for invalid X-User-Id', async () => {
    const createProject = mockUseCase({ ok: true, value: validProject() })
    const { app } = createApp({ createProject })

    await app.request('/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': 'not-a-uuid',
      },
      body: JSON.stringify({ name: 'Test Project' }),
    })

    expect(createProject.execute).toHaveBeenCalledWith(
      expect.anything(),
      FALLBACK_USER_ID,
    )
  })

  it('rP-07: validation error returns 422', async () => {
    const createProject = mockUseCase({
      ok: false,
      error: new ValidationError('name', 'too short'),
    })
    const { app } = createApp({ createProject })

    const res = await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    })
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rP-08: conflict error returns 409', async () => {
    const createProject = mockUseCase({
      ok: false,
      error: new ConflictError('Project', 'x', 'duplicate'),
    })
    const { app } = createApp({ createProject })

    const res = await app.request('/projects', {
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

    const res = await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(422)
  })

  it('rP-10: empty name in body returns 422', async () => {
    const { app } = createApp({})

    const res = await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })

    expect(res.status).toBe(422)
  })

  it('rP-11: response wrapped in data envelope', async () => {
    const createProject = mockUseCase({ ok: true, value: validProject() })
    const { app } = createApp({ createProject })

    const res = await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Project' }),
    })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data).toBeDefined()
    expect(body.data.id).toBeDefined()
    expect(body.data.name).toBeDefined()
  })

  it('rP-12: success with all optional fields', async () => {
    const project = validProject()
    const createProject = mockUseCase({
      ok: true,
      value: { ...project, description: 'D', metadata: { x: 1 } },
    })
    const { app } = createApp({ createProject })

    const res = await app.request('/projects', {
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
    const project = validProject()
    const createProject = mockUseCase({
      ok: true,
      value: { ...project, name: 'a'.repeat(200) },
    })
    const { app } = createApp({ createProject })

    const res = await app.request('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'a'.repeat(200) }),
    })

    expect(res.status).toBe(201)
  })
})
