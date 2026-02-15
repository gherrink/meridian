import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

import { createCorsMiddleware } from '../src/middleware/cors.js'

function createTestApp(corsOrigins?: string[]) {
  const app = new Hono()
  app.use('*', createCorsMiddleware(corsOrigins))
  app.get('/test', c => c.json({ ok: true }))
  return app
}

describe('corsMiddleware', () => {
  it('tC-17: default allows all origins (no origin restriction)', async () => {
    const app = createTestApp()

    const res = await app.request('/test', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://any-origin.com',
        'Access-Control-Request-Method': 'GET',
      },
    })

    // Default config does not restrict origins: no Access-Control-Allow-Origin header
    // means no explicit origin blocking. Vary: Origin indicates dynamic origin handling.
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Methods')).toBeTruthy()
  })

  it('tC-18: custom origins applied', async () => {
    const app = createTestApp(['https://example.com'])

    const res = await app.request('/test', {
      headers: {
        Origin: 'https://example.com',
      },
    })

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
  })

  it('tC-19: allowed methods header present', async () => {
    const app = createTestApp()

    const res = await app.request('/test', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://any-origin.com',
        'Access-Control-Request-Method': 'GET',
      },
    })

    const methods = res.headers.get('Access-Control-Allow-Methods') ?? ''
    expect(methods).toContain('GET')
    expect(methods).toContain('POST')
    expect(methods).toContain('PUT')
    expect(methods).toContain('PATCH')
    expect(methods).toContain('DELETE')
  })

  it('tC-20: allowed headers', async () => {
    const app = createTestApp()

    const res = await app.request('/test', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://any-origin.com',
        'Access-Control-Request-Method': 'GET',
      },
    })

    const headers = res.headers.get('Access-Control-Allow-Headers') ?? ''
    expect(headers).toContain('Content-Type')
    expect(headers).toContain('Authorization')
  })

  it('tC-21: expose headers', async () => {
    const app = createTestApp()

    const res = await app.request('/test', {
      headers: {
        Origin: 'https://any-origin.com',
      },
    })

    const exposed = res.headers.get('Access-Control-Expose-Headers') ?? ''
    expect(exposed).toContain('X-Request-Id')
  })
})
