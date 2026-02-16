import { describe, expect, it } from 'vitest'

import { ConfigurationError } from '../../src/config/configuration-error.js'
import { loadConfig } from '../../src/config/load-config.js'

function createEnv(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    MERIDIAN_ADAPTER: 'github',
    GITHUB_TOKEN: 'ghp_test123',
    GITHUB_OWNER: 'octocat',
    GITHUB_REPO: 'hello-world',
    ...overrides,
  }
}

function createLocalEnv(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    MERIDIAN_ADAPTER: 'local',
    ...overrides,
  }
}

describe('loadConfig -- GitHub Adapter (happy path)', () => {
  it('gH-01: returns github config with required fields', () => {
    const result = loadConfig(createEnv())

    expect(result.adapter).toBe('github')
    expect(result.adapter === 'github' && result.github.token).toBe('ghp_test123')
    expect(result.adapter === 'github' && result.github.owner).toBe('octocat')
    expect(result.adapter === 'github' && result.github.repo).toBe('hello-world')
  })

  it('gH-02: applies server defaults', () => {
    const result = loadConfig(createEnv())

    expect(result.server.port).toBe(3000)
    expect(result.server.mcpTransport).toBe('stdio')
    expect(result.server.mcpHttpPort).toBe(3001)
  })

  it('gH-03: applies logging defaults', () => {
    const result = loadConfig(createEnv())

    expect(result.logging.level).toBe('info')
    expect(result.logging.auditLogPath).toBeUndefined()
  })

  it('gH-04: reads custom server config', () => {
    const result = loadConfig(createEnv({
      HEART_PORT: '8080',
      MCP_TRANSPORT: 'http',
      MCP_HTTP_PORT: '9090',
    }))

    expect(result.server.port).toBe(8080)
    expect(result.server.mcpTransport).toBe('http')
    expect(result.server.mcpHttpPort).toBe(9090)
  })

  it('gH-05: reads custom logging config', () => {
    const result = loadConfig(createEnv({
      LOG_LEVEL: 'debug',
      AUDIT_LOG_PATH: '/tmp/audit.log',
    }))

    expect(result.logging.level).toBe('debug')
    expect(result.logging.auditLogPath).toBe('/tmp/audit.log')
  })

  it('gH-06: reads optional GITHUB_PROJECT_ID', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const result = loadConfig(createEnv({ GITHUB_PROJECT_ID: uuid }))

    expect(result.adapter === 'github' && result.github.projectId).toBe(uuid)
  })

  it('gH-07: projectId undefined when omitted', () => {
    const result = loadConfig(createEnv())

    expect(result.adapter === 'github' && result.github.projectId).toBeUndefined()
  })

  it('gH-08: returned config is frozen', () => {
    const result = loadConfig(createEnv())

    expect(Object.isFrozen(result)).toBe(true)
  })

  it('gH-09: server sub-object is frozen', () => {
    const result = loadConfig(createEnv())

    expect(Object.isFrozen(result.server)).toBe(true)
  })
})

describe('loadConfig -- Local Adapter (happy path)', () => {
  it('lC-01: returns local config with default tracker URL', () => {
    const result = loadConfig(createLocalEnv())

    expect(result.adapter).toBe('local')
    expect(result.adapter === 'local' && result.local.trackerUrl).toBe('http://localhost:8000')
  })

  it('lC-02: reads custom TRACKER_URL', () => {
    const result = loadConfig(createLocalEnv({ TRACKER_URL: 'http://tracker:9000' }))

    expect(result.adapter === 'local' && result.local.trackerUrl).toBe('http://tracker:9000')
  })

  it('lC-03: local config has no github property', () => {
    const result = loadConfig(createLocalEnv())

    expect('github' in result).toBe(false)
  })

  it('lC-04: local config has server and logging', () => {
    const result = loadConfig(createLocalEnv())

    expect(result.server).toBeDefined()
    expect(result.logging).toBeDefined()
    expect(result.server.port).toBe(3000)
    expect(result.logging.level).toBe('info')
  })
})

describe('loadConfig -- Validation Errors', () => {
  it('vE-01: missing MERIDIAN_ADAPTER', () => {
    expect(() => loadConfig({})).toThrow(ConfigurationError)

    try {
      loadConfig({})
    }
    catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      const configError = error as InstanceType<typeof ConfigurationError>
      const fields = configError.issues.map(i => i.field)
      expect(fields.some(f => f.includes('MERIDIAN_ADAPTER'))).toBe(true)
    }
  })

  it('vE-02: invalid MERIDIAN_ADAPTER value', () => {
    expect(() => loadConfig({ MERIDIAN_ADAPTER: 'jira' })).toThrow(ConfigurationError)
  })

  it('vE-03: missing GITHUB_TOKEN (github adapter)', () => {
    expect(() => loadConfig(createEnv({ GITHUB_TOKEN: undefined }))).toThrow(ConfigurationError)

    try {
      loadConfig(createEnv({ GITHUB_TOKEN: undefined }))
    }
    catch (error) {
      const configError = error as InstanceType<typeof ConfigurationError>
      const fields = configError.issues.map(i => i.field)
      expect(fields.some(f => f.includes('GITHUB_TOKEN'))).toBe(true)
    }
  })

  it('vE-04: missing GITHUB_OWNER (github adapter)', () => {
    expect(() => loadConfig(createEnv({ GITHUB_OWNER: undefined }))).toThrow(ConfigurationError)

    try {
      loadConfig(createEnv({ GITHUB_OWNER: undefined }))
    }
    catch (error) {
      const configError = error as InstanceType<typeof ConfigurationError>
      const fields = configError.issues.map(i => i.field)
      expect(fields.some(f => f.includes('GITHUB_OWNER'))).toBe(true)
    }
  })

  it('vE-05: missing GITHUB_REPO (github adapter)', () => {
    expect(() => loadConfig(createEnv({ GITHUB_REPO: undefined }))).toThrow(ConfigurationError)

    try {
      loadConfig(createEnv({ GITHUB_REPO: undefined }))
    }
    catch (error) {
      const configError = error as InstanceType<typeof ConfigurationError>
      const fields = configError.issues.map(i => i.field)
      expect(fields.some(f => f.includes('GITHUB_REPO'))).toBe(true)
    }
  })

  it('vE-06: empty string GITHUB_TOKEN', () => {
    expect(() => loadConfig(createEnv({ GITHUB_TOKEN: '' }))).toThrow(ConfigurationError)
  })

  it('vE-07: invalid GITHUB_PROJECT_ID (not uuid)', () => {
    expect(() => loadConfig(createEnv({ GITHUB_PROJECT_ID: 'not-a-uuid' }))).toThrow(ConfigurationError)
  })

  it('vE-08: invalid HEART_PORT (non-numeric)', () => {
    expect(() => loadConfig(createEnv({ HEART_PORT: 'abc' }))).toThrow(ConfigurationError)
  })

  it('vE-09: invalid HEART_PORT (negative)', () => {
    expect(() => loadConfig(createEnv({ HEART_PORT: '-1' }))).toThrow(ConfigurationError)
  })

  it('vE-10: invalid LOG_LEVEL value', () => {
    expect(() => loadConfig(createEnv({ LOG_LEVEL: 'verbose' }))).toThrow(ConfigurationError)
  })

  it('vE-11: invalid MCP_TRANSPORT value', () => {
    expect(() => loadConfig(createEnv({ MCP_TRANSPORT: 'ws' }))).toThrow(ConfigurationError)
  })

  it('vE-12: invalid TRACKER_URL (not a URL)', () => {
    expect(() => loadConfig(createLocalEnv({ TRACKER_URL: 'not-a-url' }))).toThrow(ConfigurationError)
  })
})

describe('loadConfig -- Error Aggregation', () => {
  it('eA-01: aggregates multiple github field errors', () => {
    try {
      loadConfig({ MERIDIAN_ADAPTER: 'github' })
      expect.unreachable('should have thrown')
    }
    catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      const configError = error as InstanceType<typeof ConfigurationError>
      expect(configError.issues.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('eA-02: aggregates server + adapter errors', () => {
    try {
      loadConfig({ MERIDIAN_ADAPTER: 'github', HEART_PORT: 'abc' })
      expect.unreachable('should have thrown')
    }
    catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      const configError = error as InstanceType<typeof ConfigurationError>
      const fields = configError.issues.map(i => i.field)
      expect(fields.some(f => f.includes('HEART_PORT') || f.includes('port'))).toBe(true)
      expect(fields.some(f => f.includes('GITHUB_TOKEN') || f.includes('token'))).toBe(true)
    }
  })

  it('eA-03: error message contains all failed fields', () => {
    try {
      loadConfig({ MERIDIAN_ADAPTER: 'github' })
      expect.unreachable('should have thrown')
    }
    catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      const configError = error as InstanceType<typeof ConfigurationError>
      expect(configError.message).toContain('GITHUB_TOKEN')
      expect(configError.message).toContain('GITHUB_OWNER')
      expect(configError.message).toContain('GITHUB_REPO')
    }
  })
})

describe('loadConfig -- Edge Cases', () => {
  it('eC-01: HEART_PORT zero is invalid (positive required)', () => {
    expect(() => loadConfig(createEnv({ HEART_PORT: '0' }))).toThrow(ConfigurationError)
  })

  it('eC-02: HEART_PORT float coerces to int check', () => {
    expect(() => loadConfig(createEnv({ HEART_PORT: '3.7' }))).toThrow(ConfigurationError)
  })

  it('eC-03: extra env vars are ignored', () => {
    const result = loadConfig(createEnv({ SOME_RANDOM_VAR: 'hello' }))

    expect(result.adapter).toBe('github')
  })

  it('eC-04: AUDIT_LOG_PATH empty string is treated as invalid', () => {
    // Spec note: empty string fails min(1) validation.
    // Implementation collects this as a ConfigurationError rather than falling through to undefined.
    expect(() => loadConfig(createEnv({ AUDIT_LOG_PATH: '' }))).toThrow(ConfigurationError)
  })

  it('eC-05: loadConfig with no args uses process.env', () => {
    // Just verifying the function can be called with no arguments without TypeError
    // The result depends on process.env state, so we only check it doesn't throw TypeError
    try {
      loadConfig()
    }
    catch (error) {
      // ConfigurationError is acceptable (process.env likely lacks required vars)
      // TypeError would indicate a function signature problem
      expect(error).not.toBeInstanceOf(TypeError)
    }
  })
})
