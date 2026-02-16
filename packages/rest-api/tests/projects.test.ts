import { OpenAPIHono } from '@hono/zod-openapi'
import { NotFoundError } from '@meridian/core'
import { describe, expect, it, vi } from 'vitest'

import { createProjectRouter } from '../src/routes/projects.js'

const UUID1 = '00000000-0000-4000-8000-000000000001'

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

function validOverview() {
  return {
    project: validProject(),
    totalIssues: 10,
    statusBreakdown: {
      open: 5,
      in_progress: 3,
      closed: 2,
    },
  }
}

function mockUseCase(returnValue: unknown) {
  return { execute: vi.fn().mockResolvedValue(returnValue) }
}

function createApp(deps: {
  getProjectOverview?: ReturnType<typeof mockUseCase>
}) {
  const getProjectOverview = deps.getProjectOverview ?? mockUseCase({ ok: true, value: validOverview() })
  const router = createProjectRouter({ getProjectOverview } as any)
  const app = new OpenAPIHono()
  app.route('/', router)
  return { app, getProjectOverview }
}

describe('projectRoutes', () => {
  describe('gET /projects/:id/overview', () => {
    it('tC-40: get project overview success', async () => {
      const overview = validOverview()
      const getProjectOverview = mockUseCase({ ok: true, value: overview })
      const { app } = createApp({ getProjectOverview })

      const res = await app.request(`/projects/${UUID1}/overview`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.project).toBeDefined()
      expect(body.data.totalIssues).toBe(10)
      expect(body.data.statusBreakdown).toBeDefined()
    })

    it('tC-41: project overview dates serialized', async () => {
      const overview = validOverview()
      const getProjectOverview = mockUseCase({ ok: true, value: overview })
      const { app } = createApp({ getProjectOverview })

      const res = await app.request(`/projects/${UUID1}/overview`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(typeof body.data.project.createdAt).toBe('string')
      expect(typeof body.data.project.updatedAt).toBe('string')
    })

    it('tC-42: project overview not found', async () => {
      const getProjectOverview = mockUseCase({
        ok: false,
        error: new NotFoundError('Project', UUID1),
      })
      const { app } = createApp({ getProjectOverview })

      const res = await app.request(`/projects/${UUID1}/overview`)
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.error.code).toBe('NOT_FOUND')
    })

    it('tC-43: project overview invalid id', async () => {
      const { app } = createApp({})

      const res = await app.request('/projects/bad-id/overview')
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('tC-44: project overview status breakdown shape', async () => {
      const overview = validOverview()
      const getProjectOverview = mockUseCase({ ok: true, value: overview })
      const { app } = createApp({ getProjectOverview })

      const res = await app.request(`/projects/${UUID1}/overview`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(typeof body.data.statusBreakdown.open).toBe('number')
      expect(typeof body.data.statusBreakdown.in_progress).toBe('number')
      expect(typeof body.data.statusBreakdown.closed).toBe('number')
    })
  })
})
