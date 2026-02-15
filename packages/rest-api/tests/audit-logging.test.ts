import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

import { createAuditMiddleware } from '../src/middleware/audit-logging.js'
import { createErrorHandler } from '../src/middleware/error-handler.js'

function createMockAuditLogger() {
  return { log: vi.fn().mockResolvedValue(undefined) }
}

describe('auditLoggingMiddleware', () => {
  it('tC-14: logs method, path, status, durationMs', async () => {
    const logger = createMockAuditLogger()
    const app = new Hono()
    app.use('*', createAuditMiddleware(logger))
    app.get('/test', c => c.json({ ok: true }))

    await app.request('/test')

    expect(logger.log).toHaveBeenCalledOnce()
    expect(logger.log).toHaveBeenCalledWith(
      'HttpRequest',
      'system',
      expect.objectContaining({
        method: 'GET',
        path: '/test',
        status: 200,
        durationMs: expect.any(Number),
      }),
    )
  })

  it('tC-15: logs on error responses too', async () => {
    const logger = createMockAuditLogger()
    const app = new Hono()
    app.use('*', createAuditMiddleware(logger))
    app.onError(createErrorHandler())
    app.get('/error', () => {
      throw new Error('boom')
    })

    await app.request('/error')

    expect(logger.log).toHaveBeenCalledWith(
      'HttpRequest',
      'system',
      expect.objectContaining({
        status: 500,
      }),
    )
  })

  it('tC-16: swallows logger failures silently', async () => {
    const logger = createMockAuditLogger()
    logger.log.mockRejectedValue(new Error('logger broken'))
    const app = new Hono()
    app.use('*', createAuditMiddleware(logger))
    app.get('/test', c => c.json({ ok: true }))

    const res = await app.request('/test')

    expect(res.status).toBe(200)
  })

  it('tC-40: audit logger receives POST method', async () => {
    const logger = createMockAuditLogger()
    const app = new Hono()
    app.use('*', createAuditMiddleware(logger))
    app.post('/data', c => c.json({ created: true }, 201))

    await app.request('/data', { method: 'POST' })

    expect(logger.log).toHaveBeenCalledWith(
      'HttpRequest',
      'system',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })
})
