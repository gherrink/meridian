import { OpenAPIHono } from '@hono/zod-openapi'
import { NotFoundError } from '@meridian/core'
import { describe, expect, it, vi } from 'vitest'

import { createErrorHandler } from '../src/middleware/error-handler.js'
import { createMilestoneRouter } from '../src/routes/milestones.js'

const UUID1 = '00000000-0000-4000-8000-000000000001'

function validMilestone() {
  return {
    id: UUID1,
    name: 'Test Milestone',
    description: '',
    status: 'open',
    dueDate: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function validOverview() {
  return {
    milestone: validMilestone(),
    totalIssues: 10,
    stateBreakdown: {
      open: 5,
      in_progress: 3,
      done: 2,
    },
  }
}

function mockUseCase(returnValue: unknown) {
  return { execute: vi.fn().mockResolvedValue(returnValue) }
}

function mockAuditLogger() {
  return {
    log: vi.fn().mockResolvedValue(undefined),
  }
}

function createApp(deps: {
  getMilestoneOverview?: ReturnType<typeof mockUseCase>
}) {
  const getMilestoneOverview = deps.getMilestoneOverview ?? mockUseCase({ ok: true, value: validOverview() })
  const router = createMilestoneRouter({ getMilestoneOverview } as any)
  const app = new OpenAPIHono()
  app.route('/', router)
  app.onError(createErrorHandler(mockAuditLogger() as any))
  return { app, getMilestoneOverview }
}

describe('milestoneRoutes', () => {
  describe('gET /milestones/:id/overview', () => {
    it('tC-40: get milestone overview success', async () => {
      const overview = validOverview()
      const getMilestoneOverview = mockUseCase({ ok: true, value: overview })
      const { app } = createApp({ getMilestoneOverview })

      const res = await app.request(`/milestones/${UUID1}/overview`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.milestone).toBeDefined()
      expect(body.data.totalIssues).toBe(10)
      expect(body.data.stateBreakdown).toBeDefined()
    })

    it('tC-41: milestone overview dates serialized', async () => {
      const overview = validOverview()
      const getMilestoneOverview = mockUseCase({ ok: true, value: overview })
      const { app } = createApp({ getMilestoneOverview })

      const res = await app.request(`/milestones/${UUID1}/overview`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(typeof body.data.milestone.createdAt).toBe('string')
      expect(typeof body.data.milestone.updatedAt).toBe('string')
    })

    it('tC-42: milestone overview not found', async () => {
      const getMilestoneOverview = mockUseCase({
        ok: false,
        error: new NotFoundError('Milestone', UUID1),
      })
      const { app } = createApp({ getMilestoneOverview })

      const res = await app.request(`/milestones/${UUID1}/overview`)
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.error.code).toBe('NOT_FOUND')
    })

    it('tC-43: milestone overview invalid id', async () => {
      const { app } = createApp({})

      const res = await app.request('/milestones/bad-id/overview')
      const body = await res.json()

      expect(res.status).toBe(422)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('tC-44: milestone overview state breakdown shape', async () => {
      const overview = validOverview()
      const getMilestoneOverview = mockUseCase({ ok: true, value: overview })
      const { app } = createApp({ getMilestoneOverview })

      const res = await app.request(`/milestones/${UUID1}/overview`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(typeof body.data.stateBreakdown.open).toBe('number')
      expect(typeof body.data.stateBreakdown.in_progress).toBe('number')
      expect(typeof body.data.stateBreakdown.done).toBe('number')
    })
  })
})
