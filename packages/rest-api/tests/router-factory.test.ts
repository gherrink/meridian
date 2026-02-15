import { createRoute, z } from '@hono/zod-openapi'
import { describe, expect, it } from 'vitest'

import { createRouter } from '../src/router-factory.js'

describe('routerFactory', () => {
  it('tC-22: invalid request body returns 422 validation envelope', async () => {
    const router = createRouter()

    const route = createRoute({
      method: 'post',
      path: '/items',
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({ name: z.string() }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: z.object({ name: z.string() }),
            },
          },
        },
      },
    })

    router.openapi(route, (c) => {
      return c.json({ name: 'test' }, 200)
    })

    const res = await router.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.message).toContain('Validation failed')
    expect(body.error.details).toBeInstanceOf(Array)
  })

  it('tC-23: valid request passes through', async () => {
    const router = createRouter()

    const route = createRoute({
      method: 'post',
      path: '/items',
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({ name: z.string() }),
            },
          },
        },
      },
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: z.object({ result: z.string() }),
            },
          },
        },
      },
    })

    router.openapi(route, (c) => {
      return c.json({ result: 'ok' }, 200)
    })

    const res = await router.request('/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.result).toBe('ok')
  })
})
