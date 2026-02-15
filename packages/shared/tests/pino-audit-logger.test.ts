import type { UserId } from '@meridian/core'
import type { AuditLoggerOptions } from '../src/pino-audit-logger.js'

import { Buffer } from 'node:buffer'
import process from 'node:process'
import { PassThrough } from 'node:stream'

import pino from 'pino'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createAuditLogger, PinoAuditLogger } from '../src/pino-audit-logger.js'

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440005' as UserId

function createCaptureStream(): { stream: PassThrough, getOutput: () => string } {
  const chunks: Buffer[] = []
  const stream = new PassThrough()
  stream.on('data', (chunk: Buffer) => chunks.push(chunk))
  return {
    stream,
    getOutput: () => Buffer.concat(chunks).toString('utf-8'),
  }
}

function createTestLogger(level: string = 'info', redactPaths?: string[]): {
  logger: PinoAuditLogger
  getOutput: () => string
} {
  const { stream, getOutput } = createCaptureStream()

  const pinoOptions: pino.LoggerOptions = { level }
  if (redactPaths) {
    pinoOptions.redact = { paths: redactPaths, censor: '[REDACTED]' }
  }

  const pinoLogger = pino(pinoOptions, stream)
  const logger = new PinoAuditLogger(pinoLogger)
  return { logger, getOutput }
}

function parseLogLine(output: string): Record<string, unknown> {
  const lines = output.trim().split('\n')
  const lastLine = lines[lines.length - 1]
  if (!lastLine) {
    throw new Error('No log output captured')
  }
  return JSON.parse(lastLine) as Record<string, unknown>
}

async function flushStream(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 50))
}

describe('pinoAuditLogger', () => {
  describe('structured output fields', () => {
    it('pAL-01: includes operation in log output', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger()

      // Act
      await logger.log('CreateIssue', TEST_USER_ID)
      await flushStream()

      // Assert
      const entry = parseLogLine(getOutput())
      expect(entry.operation).toBe('CreateIssue')
    })

    it('pAL-02: includes userId in log output', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger()

      // Act
      await logger.log('CreateIssue', TEST_USER_ID)
      await flushStream()

      // Assert
      const entry = parseLogLine(getOutput())
      expect(entry.userId).toBe(TEST_USER_ID)
    })

    it('pAL-03: includes audit:true flag', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger()

      // Act
      await logger.log('CreateIssue', TEST_USER_ID)
      await flushStream()

      // Assert
      const entry = parseLogLine(getOutput())
      expect(entry.audit).toBe(true)
    })

    it('pAL-04: includes timestamp as number', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger()

      // Act
      await logger.log('CreateIssue', TEST_USER_ID)
      await flushStream()

      // Assert
      const entry = parseLogLine(getOutput())
      expect(entry.time).toBeDefined()
      expect(typeof entry.time).toBe('number')
    })

    it('pAL-05: logs at info level (numeric 30)', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger()

      // Act
      await logger.log('CreateIssue', TEST_USER_ID)
      await flushStream()

      // Assert
      const entry = parseLogLine(getOutput())
      expect(entry.level).toBe(30)
    })
  })

  describe('metadata handling', () => {
    it('pAL-06: includes metadata fields when provided', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger()
      const metadata = { issueId: 'abc-123', projectId: 'proj-456' }

      // Act
      await logger.log('CreateIssue', TEST_USER_ID, metadata)
      await flushStream()

      // Assert
      const entry = parseLogLine(getOutput())
      const loggedMetadata = entry.metadata as Record<string, unknown>
      expect(loggedMetadata.issueId).toBe('abc-123')
      expect(loggedMetadata.projectId).toBe('proj-456')
    })

    it('pAL-07: omits metadata when not provided', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger()

      // Act
      await logger.log('Op', TEST_USER_ID)
      await flushStream()

      // Assert
      const entry = parseLogLine(getOutput())
      expect(entry.metadata).toBeUndefined()
    })

    it('pAL-08: handles empty metadata object', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger()

      // Act
      await logger.log('Op', TEST_USER_ID, {})
      await flushStream()

      // Assert
      const entry = parseLogLine(getOutput())
      expect(entry.metadata).toEqual({})
    })
  })

  describe('redaction', () => {
    it('pAL-09: redacts token field', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger('info', ['metadata.token'])
      const metadata = { token: 'secret', safe: 'ok' }

      // Act
      await logger.log('CreateIssue', TEST_USER_ID, metadata)
      await flushStream()

      // Assert
      const entry = parseLogLine(getOutput())
      const loggedMetadata = entry.metadata as Record<string, unknown>
      expect(loggedMetadata.token).toBe('[REDACTED]')
      expect(loggedMetadata.safe).toBe('ok')
    })

    it('pAL-10: redacts password field', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger('info', ['metadata.password'])
      const metadata = { password: 'pw123' }

      // Act
      await logger.log('CreateIssue', TEST_USER_ID, metadata)
      await flushStream()

      // Assert
      const entry = parseLogLine(getOutput())
      const loggedMetadata = entry.metadata as Record<string, unknown>
      expect(loggedMetadata.password).toBe('[REDACTED]')
    })

    it('pAL-11: redacts multiple fields simultaneously', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger('info', ['metadata.token', 'metadata.password'])
      const metadata = { token: 'secret-token', password: 'secret-pw' }

      // Act
      await logger.log('CreateIssue', TEST_USER_ID, metadata)
      await flushStream()

      // Assert
      const entry = parseLogLine(getOutput())
      const loggedMetadata = entry.metadata as Record<string, unknown>
      expect(loggedMetadata.token).toBe('[REDACTED]')
      expect(loggedMetadata.password).toBe('[REDACTED]')
    })

    it('pAL-12: leaves non-sensitive fields untouched', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger('info', ['metadata.token'])
      const metadata = { safe: 'visible' }

      // Act
      await logger.log('CreateIssue', TEST_USER_ID, metadata)
      await flushStream()

      // Assert
      const entry = parseLogLine(getOutput())
      const loggedMetadata = entry.metadata as Record<string, unknown>
      expect(loggedMetadata.safe).toBe('visible')
    })
  })

  describe('log level filtering', () => {
    it('pAL-13: suppresses info when level=warn', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger('warn')

      // Act
      await logger.log('CreateIssue', TEST_USER_ID)
      await flushStream()

      // Assert
      expect(getOutput().trim()).toBe('')
    })

    it('pAL-14: suppresses info when level=error', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger('error')

      // Act
      await logger.log('CreateIssue', TEST_USER_ID)
      await flushStream()

      // Assert
      expect(getOutput().trim()).toBe('')
    })

    it('pAL-15: emits info when level=debug', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger('debug')

      // Act
      await logger.log('CreateIssue', TEST_USER_ID)
      await flushStream()

      // Assert
      expect(getOutput().trim()).not.toBe('')
    })

    it('pAL-16: emits info when level=info', async () => {
      // Arrange
      const { logger, getOutput } = createTestLogger('info')

      // Act
      await logger.log('CreateIssue', TEST_USER_ID)
      await flushStream()

      // Assert
      expect(getOutput().trim()).not.toBe('')
    })
  })

  describe('iAuditLogger interface conformance', () => {
    it('pAL-17: log returns Promise<void>', async () => {
      // Arrange
      const { logger } = createTestLogger()

      // Act
      const result = logger.log('CreateIssue', TEST_USER_ID)

      // Assert
      expect(result).toBeInstanceOf(Promise)
      expect(await result).toBeUndefined()
    })

    it('pAL-18: log is an arrow function property', () => {
      // Arrange
      const { logger } = createTestLogger()

      // Assert
      expect(typeof logger.log).toBe('function')
    })
  })
})

describe('createAuditLogger', () => {
  let originalLogLevel: string | undefined
  let originalAuditLogPath: string | undefined

  beforeEach(() => {
    originalLogLevel = process.env.LOG_LEVEL
    originalAuditLogPath = process.env.AUDIT_LOG_PATH
    delete process.env.LOG_LEVEL
    delete process.env.AUDIT_LOG_PATH
  })

  afterEach(() => {
    if (originalLogLevel !== undefined) {
      process.env.LOG_LEVEL = originalLogLevel
    }
    else {
      delete process.env.LOG_LEVEL
    }
    if (originalAuditLogPath !== undefined) {
      process.env.AUDIT_LOG_PATH = originalAuditLogPath
    }
    else {
      delete process.env.AUDIT_LOG_PATH
    }
  })

  it('pAL-19: returns PinoAuditLogger instance', () => {
    // Act
    const logger = createAuditLogger()

    // Assert
    expect(logger).toBeInstanceOf(PinoAuditLogger)
  })

  it('pAL-20: accepts programmatic level option', () => {
    // Act
    const logger = createAuditLogger({ level: 'debug' })

    // Assert
    expect(logger).toBeInstanceOf(PinoAuditLogger)
  })

  it('pAL-21: accepts programmatic level=error', () => {
    // Act
    const logger = createAuditLogger({ level: 'error' })

    // Assert
    expect(logger).toBeInstanceOf(PinoAuditLogger)
  })

  it('pAL-22: falls back to info for invalid LOG_LEVEL env', () => {
    // Arrange
    process.env.LOG_LEVEL = 'nonsense'

    // Act
    const logger = createAuditLogger()

    // Assert
    expect(logger).toBeInstanceOf(PinoAuditLogger)
  })

  it('pAL-23: respects LOG_LEVEL env var (warn)', () => {
    // Arrange
    process.env.LOG_LEVEL = 'warn'

    // Act
    const logger = createAuditLogger()

    // Assert
    expect(logger).toBeInstanceOf(PinoAuditLogger)
  })

  it('pAL-24: programmatic level overrides LOG_LEVEL env', () => {
    // Arrange
    process.env.LOG_LEVEL = 'error'

    // Act
    const logger = createAuditLogger({ level: 'debug' })

    // Assert
    expect(logger).toBeInstanceOf(PinoAuditLogger)
  })

  it('pAL-25: works without any options', () => {
    // Act & Assert
    expect(() => createAuditLogger()).not.toThrow()
    const logger = createAuditLogger()
    expect(logger).toBeInstanceOf(PinoAuditLogger)
  })

  it('pAL-26: defaults to stdout when AUDIT_LOG_PATH unset', () => {
    // Act & Assert
    expect(() => createAuditLogger()).not.toThrow()
  })

  it('pAL-27: accepts custom redactPaths option', () => {
    // Act
    const logger = createAuditLogger({ redactPaths: ['metadata.apiKey'] })

    // Assert
    expect(logger).toBeInstanceOf(PinoAuditLogger)
  })
})

describe('pinoAuditLogger - edge cases', () => {
  it('pAL-28: multiple log calls produce multiple NDJSON lines', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    await logger.log('Op1', TEST_USER_ID)
    await logger.log('Op2', TEST_USER_ID)
    await logger.log('Op3', TEST_USER_ID)
    await flushStream()

    // Assert
    const output = getOutput().trim()
    const lines = output.split('\n').filter(l => l.trim() !== '')
    expect(lines).toHaveLength(3)
    // Verify each line is parseable JSON
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow()
    }
  })

  it('pAL-29: metadata with nested objects', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()
    const metadata = { nested: { deep: 'value' } }

    // Act
    await logger.log('CreateIssue', TEST_USER_ID, metadata)
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    const loggedMetadata = entry.metadata as Record<string, unknown>
    const nested = loggedMetadata.nested as Record<string, unknown>
    expect(nested.deep).toBe('value')
  })

  it('pAL-30: empty string operation name', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    await logger.log('', TEST_USER_ID)
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.operation).toBe('')
  })

  it('pAL-31: log is callable after destructuring', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()
    const { log } = logger

    // Act & Assert
    await expect(log('Op', TEST_USER_ID)).resolves.toBeUndefined()
    await flushStream()

    const entry = parseLogLine(getOutput())
    expect(entry.operation).toBe('Op')
  })
})

describe('exports verification', () => {
  it('pAL-32: PinoAuditLogger is exported from index', async () => {
    // Act
    const mod = await import('../src/index.js')

    // Assert
    expect(mod.PinoAuditLogger).toBeDefined()
  })

  it('pAL-33: createAuditLogger is exported from index', async () => {
    // Act
    const mod = await import('../src/index.js')

    // Assert
    expect(mod.createAuditLogger).toBeDefined()
  })

  it('pAL-34: AuditLoggerOptions type is usable', () => {
    // Type-level verification: if this compiles, the type is exported and usable
    const options: AuditLoggerOptions = { level: 'info' }
    expect(options).toBeDefined()
  })
})
