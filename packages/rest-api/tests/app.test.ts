import type { RestApiDependencies } from '../src/types.js'
import { describe, expect, it, vi } from 'vitest'

import { createRestApiApp } from '../src/app.js'

function createMockAuditLogger() {
  return { log: vi.fn().mockResolvedValue(undefined) }
}

function createMockDependencies(overrides?: Partial<RestApiDependencies>): RestApiDependencies {
  return {
    auditLogger: createMockAuditLogger(),
    createIssue: {} as RestApiDependencies['createIssue'],
    createMilestone: {} as RestApiDependencies['createMilestone'],
    listIssues: {} as RestApiDependencies['listIssues'],
    updateIssue: {} as RestApiDependencies['updateIssue'],
    updateStatus: {} as RestApiDependencies['updateStatus'],
    assignIssue: {} as RestApiDependencies['assignIssue'],
    getMilestoneOverview: {} as RestApiDependencies['getMilestoneOverview'],
    issueRepository: {} as RestApiDependencies['issueRepository'],
    commentRepository: {} as RestApiDependencies['commentRepository'],
    ...overrides,
  }
}

describe('appFactory', () => {
  it('tC-26: createRestApiApp returns Hono app', () => {
    const deps = createMockDependencies()

    const app = createRestApiApp(deps)

    expect(app).toBeDefined()
    expect(typeof app.request).toBe('function')
  })

  it('tC-27: health endpoint at /api/v1/health', async () => {
    const deps = createMockDependencies()
    const app = createRestApiApp(deps)

    const res = await app.request('/api/v1/health')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.status).toBe('ok')
  })

  it('tC-28: unknown route returns 404', async () => {
    const deps = createMockDependencies()
    const app = createRestApiApp(deps)

    const res = await app.request('/api/v1/nonexistent')

    expect(res.status).toBe(404)
  })

  it('tC-29: request-id middleware attaches header', async () => {
    const deps = createMockDependencies()
    const app = createRestApiApp(deps)

    const res = await app.request('/api/v1/health')

    const requestId = res.headers.get('X-Request-Id')
    expect(requestId).toBeTruthy()
    expect(requestId!.length).toBeGreaterThan(0)
  })

  it('tC-30: OpenAPI doc endpoint at /doc', async () => {
    const deps = createMockDependencies()
    const app = createRestApiApp(deps)

    const res = await app.request('/doc')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.openapi).toBe('3.1.0')
    expect(body.info.title).toBe('Meridian Heart API')
  })

  it('tC-31: audit middleware is active', async () => {
    const mockLogger = createMockAuditLogger()
    const deps = createMockDependencies({ auditLogger: mockLogger })
    const app = createRestApiApp(deps)

    await app.request('/api/v1/health')

    expect(mockLogger.log).toHaveBeenCalledWith(
      'HttpRequest',
      'system',
      expect.objectContaining({
        path: '/api/v1/health',
      }),
    )
  })

  it('tC-32: CORS headers present on /api/v1/health', async () => {
    const deps = createMockDependencies()
    const app = createRestApiApp(deps)

    // Use a preflight OPTIONS request to reliably get CORS headers
    const res = await app.request('/api/v1/health', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'GET',
      },
    })

    // Check for any CORS header being present
    const allowOrigin = res.headers.get('Access-Control-Allow-Origin')
    const allowMethods = res.headers.get('Access-Control-Allow-Methods')
    expect(allowOrigin ?? allowMethods).toBeTruthy()
  })

  it('tC-41: health endpoint not at root /health (only /api/v1/health)', async () => {
    const deps = createMockDependencies()
    const app = createRestApiApp(deps)

    const res = await app.request('/health')

    expect(res.status).toBe(404)
  })
})
