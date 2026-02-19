import type { RestApiDependencies } from '../src/types.js'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { createRestApiApp } from '../src/app.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function createStubDependencies(): RestApiDependencies {
  return {
    auditLogger: { log: vi.fn().mockResolvedValue(undefined) },
    createIssue: {} as RestApiDependencies['createIssue'],
    createMilestone: {} as RestApiDependencies['createMilestone'],
    listIssues: {} as RestApiDependencies['listIssues'],
    updateIssue: {} as RestApiDependencies['updateIssue'],
    updateState: {} as RestApiDependencies['updateState'],
    assignIssue: {} as RestApiDependencies['assignIssue'],
    getMilestoneOverview: {} as RestApiDependencies['getMilestoneOverview'],
    issueRepository: {} as RestApiDependencies['issueRepository'],
    commentRepository: {} as RestApiDependencies['commentRepository'],
  }
}

describe('openAPI Spec', () => {
  let spec: Record<string, any>

  const app = createRestApiApp(createStubDependencies())

  beforeAll(async () => {
    const res = await app.request('/doc')
    expect(res.status).toBe(200)
    spec = await res.json()
  })

  describe('openAPI Metadata', () => {
    it('tC-01: spec version is 3.1.0', () => {
      expect(spec.openapi).toBe('3.1.0')
    })

    it('tC-02: info.title is "Meridian Heart API"', () => {
      expect(spec.info.title).toBe('Meridian Heart API')
    })

    it('tC-03: info.version is "0.1.0"', () => {
      expect(spec.info.version).toBe('0.1.0')
    })

    it('tC-04: info.description is present and non-empty', () => {
      expect(typeof spec.info.description).toBe('string')
      expect(spec.info.description.length).toBeGreaterThan(0)
    })

    it('tC-05: servers array contains v1 entry', () => {
      expect(spec.servers.length).toBeGreaterThanOrEqual(1)
      expect(spec.servers[0].url).toBe('/api/v1')
    })
  })

  describe('tags', () => {
    it('tC-06: all 5 tags are defined', () => {
      const tagNames = spec.tags.map((t: { name: string }) => t.name)
      expect(tagNames).toContain('System')
      expect(tagNames).toContain('Issues')
      expect(tagNames).toContain('Comments')
      expect(tagNames).toContain('Labels')
      expect(tagNames).toContain('Milestones')
    })

    it('tC-07: each tag has a description', () => {
      for (const tag of spec.tags) {
        expect(typeof tag.description).toBe('string')
        expect(tag.description.length).toBeGreaterThan(0)
      }
    })
  })

  describe('paths Completeness', () => {
    it('tC-08: spec has at least 6 paths', () => {
      expect(Object.keys(spec.paths).length).toBeGreaterThanOrEqual(6)
    })

    it('tC-09: health path exists', () => {
      expect(spec.paths['/api/v1/health']).toBeDefined()
      expect(spec.paths['/api/v1/health'].get).toBeDefined()
    })

    it('tC-10: issues list/create path exists', () => {
      expect(spec.paths['/api/v1/issues']).toBeDefined()
      expect(spec.paths['/api/v1/issues'].get).toBeDefined()
      expect(spec.paths['/api/v1/issues'].post).toBeDefined()
    })

    it('tC-11: issues get/update path exists', () => {
      expect(spec.paths['/api/v1/issues/{id}']).toBeDefined()
      expect(spec.paths['/api/v1/issues/{id}'].get).toBeDefined()
      expect(spec.paths['/api/v1/issues/{id}'].patch).toBeDefined()
    })

    it('tC-12: comments path exists', () => {
      expect(spec.paths['/api/v1/issues/{id}/comments']).toBeDefined()
      expect(spec.paths['/api/v1/issues/{id}/comments'].get).toBeDefined()
      expect(spec.paths['/api/v1/issues/{id}/comments'].post).toBeDefined()
    })

    it('tC-13: labels path exists', () => {
      expect(spec.paths['/api/v1/labels']).toBeDefined()
      expect(spec.paths['/api/v1/labels'].get).toBeDefined()
    })

    it('tC-14: milestones overview path exists', () => {
      expect(spec.paths['/api/v1/milestones/{id}/overview']).toBeDefined()
      expect(spec.paths['/api/v1/milestones/{id}/overview'].get).toBeDefined()
    })
  })

  describe('route Tags Assignment', () => {
    it('tC-15: health route tagged "System"', () => {
      expect(spec.paths['/api/v1/health'].get.tags).toContain('System')
    })

    it('tC-16: issue routes tagged "Issues"', () => {
      expect(spec.paths['/api/v1/issues'].post.tags).toContain('Issues')
    })

    it('tC-17: comment routes tagged "Comments"', () => {
      expect(spec.paths['/api/v1/issues/{id}/comments'].post.tags).toContain('Comments')
    })

    it('tC-18: label routes tagged "Labels"', () => {
      expect(spec.paths['/api/v1/labels'].get.tags).toContain('Labels')
    })

    it('tC-19: milestone routes tagged "Milestones"', () => {
      expect(spec.paths['/api/v1/milestones/{id}/overview'].get.tags).toContain('Milestones')
    })
  })

  describe('named Schemas in components', () => {
    it('tC-20: all expected named schemas exist', () => {
      const expectedSchemas = [
        'Issue',
        'CreateIssueRequest',
        'UpdateIssueRequest',
        'IssueParams',
        'IssueFilterQuery',
        'Comment',
        'CreateCommentRequest',
        'CommentParams',
        'CommentPaginationQuery',
        'Tag',
        'Milestone',
        'MilestoneOverview',
        'MilestoneOverviewParams',
        'ErrorDetail',
        'ErrorResponse',
        'PaginationMeta',
        'HealthData',
        'LabelQuery',
      ]

      for (const name of expectedSchemas) {
        expect(spec.components.schemas, `missing schema: ${name}`).toHaveProperty(name)
      }
    })

    it('tC-21: no hash-based schema names', () => {
      const schemaKeys = Object.keys(spec.components.schemas)
      for (const key of schemaKeys) {
        expect(key, `schema name "${key}" is not PascalCase`).toMatch(/^[A-Z][a-zA-Z]+$/)
      }
    })

    it('tC-22: schemas use $ref for composition', () => {
      expect(spec.components.schemas.Issue.properties.tags.items.$ref).toBe(
        '#/components/schemas/Tag',
      )
    })

    it('tC-23: MilestoneOverview references Milestone via $ref', () => {
      expect(spec.components.schemas.MilestoneOverview.properties.milestone.$ref).toBe(
        '#/components/schemas/Milestone',
      )
    })

    it('tC-24: ErrorResponse references ErrorDetail via $ref', () => {
      expect(spec.components.schemas.ErrorResponse.properties.error.$ref).toBe(
        '#/components/schemas/ErrorDetail',
      )
    })
  })

  describe('route Response Schema References', () => {
    it('tC-25: POST /issues 201 response references Issue', () => {
      const postIssues = spec.paths['/api/v1/issues'].post
      const responseSchema = postIssues.responses['201'].content['application/json'].schema
      expect(JSON.stringify(responseSchema)).toContain('Issue')
      expect(responseSchema.properties.data.$ref).toContain('Issue')
    })

    it('tC-26: GET /issues 200 response has data array with Issue $ref', () => {
      const getIssues = spec.paths['/api/v1/issues'].get
      const responseSchema = getIssues.responses['200'].content['application/json'].schema
      expect(responseSchema.properties.data.type).toBe('array')
      expect(responseSchema.properties.data.items.$ref).toContain('Issue')
    })

    it('tC-27: error responses reference ErrorResponse', () => {
      const patchIssue = spec.paths['/api/v1/issues/{id}'].patch
      const errorSchema = patchIssue.responses['422'].content['application/json'].schema
      expect(errorSchema.$ref).toContain('ErrorResponse')
    })
  })

  describe('interactive Docs Endpoint', () => {
    it('tC-28: /api/docs returns 200 with HTML', async () => {
      const res = await app.request('/api/docs')
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/html')
    })

    it('tC-29: /api/docs HTML references /doc spec URL', async () => {
      const res = await app.request('/api/docs')
      const body = await res.text()
      expect(body).toContain('/doc')
    })
  })

  describe('edge Cases', () => {
    it('tC-37: spec paths object has no empty operations', () => {
      const httpMethods = ['get', 'post', 'patch', 'put', 'delete']
      for (const [path, pathItem] of Object.entries(spec.paths) as [string, Record<string, any>][]) {
        const hasOperation = httpMethods.some(method => pathItem[method] !== undefined)
        expect(hasOperation, `path "${path}" has no operations`).toBe(true)
      }
    })

    it('tC-38: all operations have a summary', () => {
      const httpMethods = ['get', 'post', 'patch', 'put', 'delete']
      for (const [path, pathItem] of Object.entries(spec.paths) as [string, Record<string, any>][]) {
        for (const method of httpMethods) {
          if (pathItem[method]) {
            expect(
              typeof pathItem[method].summary,
              `${method.toUpperCase()} ${path} missing summary`,
            ).toBe('string')
            expect(
              pathItem[method].summary.length,
              `${method.toUpperCase()} ${path} has empty summary`,
            ).toBeGreaterThan(0)
          }
        }
      }
    })

    it('tC-39: request body schemas use $ref (not inline)', () => {
      const postIssues = spec.paths['/api/v1/issues'].post
      const reqBodySchema = postIssues.requestBody.content['application/json'].schema
      expect(reqBodySchema.$ref).toBeDefined()
    })

    it('tC-40: spec has no unknown/extra top-level keys', () => {
      const allowedKeys = [
        'openapi',
        'info',
        'servers',
        'tags',
        'paths',
        'components',
        'webhooks',
        'security',
        'externalDocs',
      ]
      for (const key of Object.keys(spec)) {
        expect(allowedKeys, `unexpected top-level key: "${key}"`).toContain(key)
      }
    })
  })
})

describe('exported openapi.json File', () => {
  const filePath = resolve(__dirname, '..', 'openapi.json')
  let parsed: Record<string, any>

  beforeAll(() => {
    const content = readFileSync(filePath, 'utf-8')
    parsed = JSON.parse(content)
  })

  it('tC-30: openapi.json exists and is valid JSON', () => {
    expect(parsed).toBeDefined()
    expect(typeof parsed).toBe('object')
  })

  it('tC-31: openapi.json has openapi 3.1.0', () => {
    expect(parsed.openapi).toBe('3.1.0')
  })

  it('tC-32: openapi.json has correct title', () => {
    expect(parsed.info.title).toBe('Meridian Heart API')
  })

  it('tC-33: openapi.json has all paths', () => {
    expect(Object.keys(parsed.paths).length).toBeGreaterThanOrEqual(6)
  })

  it('tC-34: openapi.json has named schemas', () => {
    expect(parsed.components.schemas).toHaveProperty('Issue')
    expect(parsed.components.schemas).toHaveProperty('Comment')
    expect(parsed.components.schemas).toHaveProperty('Tag')
    expect(parsed.components.schemas).toHaveProperty('Milestone')
  })
})

describe('turborepo Integration', () => {
  it('tC-35: generate:openapi script exists in package.json', () => {
    const pkgPath = resolve(__dirname, '..', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    expect(pkg.scripts['generate:openapi']).toBe('tsx scripts/export-openapi.ts')
  })

  it('tC-36: turbo.json has generate:openapi task', () => {
    const turboPath = resolve(__dirname, '..', '..', '..', 'turbo.json')
    const turbo = JSON.parse(readFileSync(turboPath, 'utf-8'))
    expect(turbo.tasks['generate:openapi']).toBeDefined()
    expect(turbo.tasks['generate:openapi'].outputs).toContain('openapi.json')
  })
})
