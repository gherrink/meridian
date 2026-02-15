import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

import { createHealthRouter } from '../src/routes/health.js'

describe('healthRoute', () => {
  it('tC-24: GET /health returns 200 with status ok', async () => {
    const healthRouter = createHealthRouter()
    const app = new Hono()
    app.route('/', healthRouter)

    const res = await app.request('/health')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
      version: '0.0.0',
    })
  })

  it('tC-25: timestamp is valid ISO datetime', async () => {
    const healthRouter = createHealthRouter()
    const app = new Hono()
    app.route('/', healthRouter)

    const res = await app.request('/health')
    const body = await res.json()

    const date = new Date(body.data.timestamp)
    expect(date.getTime()).not.toBeNaN()
  })
})
