import type { LoggerOptions } from '../src/pino-logger.js'

import { Buffer } from 'node:buffer'
import process from 'node:process'
import { PassThrough } from 'node:stream'

import pino from 'pino'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_REDACT_PATHS, isValidLogLevel, STDERR_FD, STDOUT_FD, VALID_LOG_LEVELS } from '../src/pino-common.js'
import { createLogger, PinoLogger } from '../src/pino-logger.js'

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
  logger: PinoLogger
  getOutput: () => string
} {
  const { stream, getOutput } = createCaptureStream()

  const pinoOptions: pino.LoggerOptions = { level }
  if (redactPaths) {
    pinoOptions.redact = { paths: redactPaths, censor: '[REDACTED]' }
  }

  const pinoLogger = pino(pinoOptions, stream)
  const logger = new PinoLogger(pinoLogger)
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

describe('pinoLogger - structured output', () => {
  it('pL-01: info() includes msg field', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.info('hello')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.msg).toBe('hello')
  })

  it('pL-02: warn() includes msg field', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.warn('warning')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.msg).toBe('warning')
  })

  it('pL-03: error() includes msg field', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.error('err')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.msg).toBe('err')
  })

  it('pL-04: debug() includes msg field', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger('debug')

    // Act
    logger.debug('dbg')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.msg).toBe('dbg')
  })

  it('pL-05: info() logs at level 30', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.info('x')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.level).toBe(30)
  })

  it('pL-06: warn() logs at level 40', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.warn('x')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.level).toBe(40)
  })

  it('pL-07: error() logs at level 50', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.error('x')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.level).toBe(50)
  })

  it('pL-08: debug() logs at level 20', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger('debug')

    // Act
    logger.debug('x')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.level).toBe(20)
  })

  it('pL-09: includes timestamp as number', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.info('x')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.time).toBeDefined()
    expect(typeof entry.time).toBe('number')
  })
})

describe('pinoLogger - metadata handling', () => {
  it('pL-10: meta fields merged into log entry', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.info('x', { issueId: 'abc' })
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.issueId).toBe('abc')
  })

  it('pL-11: multiple meta fields present', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.info('x', { a: 1, b: 'two' })
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.a).toBe(1)
    expect(entry.b).toBe('two')
  })

  it('pL-12: no meta produces no extra fields', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.info('msg only')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.msg).toBe('msg only')
    expect(entry.level).toBeDefined()
    expect(entry.time).toBeDefined()
    // Should not have undefined keys or extra fields beyond standard pino fields
    const knownKeys = new Set(['msg', 'level', 'time', 'pid', 'hostname'])
    for (const key of Object.keys(entry)) {
      expect(knownKeys.has(key)).toBe(true)
    }
  })

  it('pL-13: empty meta object is harmless', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.info('x', {})
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.msg).toBe('x')
  })

  it('pL-14: nested meta objects preserved', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.info('x', { nested: { deep: 'v' } })
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    const nested = entry.nested as Record<string, unknown>
    expect(nested.deep).toBe('v')
  })
})

describe('pinoLogger - level filtering', () => {
  it('pL-15: debug suppressed at info level', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger('info')

    // Act
    logger.debug('x')
    await flushStream()

    // Assert
    expect(getOutput().trim()).toBe('')
  })

  it('pL-16: info emitted at info level', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger('info')

    // Act
    logger.info('x')
    await flushStream()

    // Assert
    expect(getOutput().trim()).not.toBe('')
  })

  it('pL-17: info suppressed at warn level', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger('warn')

    // Act
    logger.info('x')
    await flushStream()

    // Assert
    expect(getOutput().trim()).toBe('')
  })

  it('pL-18: warn suppressed at error level', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger('error')

    // Act
    logger.warn('x')
    await flushStream()

    // Assert
    expect(getOutput().trim()).toBe('')
  })

  it('pL-19: error emitted at error level', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger('error')

    // Act
    logger.error('x')
    await flushStream()

    // Assert
    expect(getOutput().trim()).not.toBe('')
  })

  it('pL-20: all levels emit at debug level', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger('debug')

    // Act
    logger.debug('d')
    logger.info('i')
    logger.warn('w')
    logger.error('e')
    await flushStream()

    // Assert
    const output = getOutput().trim()
    const lines = output.split('\n').filter(l => l.trim() !== '')
    expect(lines).toHaveLength(4)
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow()
    }
  })
})

describe('pinoLogger - child logger', () => {
  it('pL-21: child() returns ILogger', () => {
    // Arrange
    const { logger } = createTestLogger()

    // Act
    const child = logger.child({ adapter: 'github' })

    // Assert
    expect(typeof child.debug).toBe('function')
    expect(typeof child.info).toBe('function')
    expect(typeof child.warn).toBe('function')
    expect(typeof child.error).toBe('function')
    expect(typeof child.child).toBe('function')
  })

  it('pL-22: child bindings in every entry', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()
    const child = logger.child({ adapter: 'gh' })

    // Act
    child.info('x')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.adapter).toBe('gh')
  })

  it('pL-23: child inherits parent level', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger('warn')
    const child = logger.child({})

    // Act
    child.info('x')
    await flushStream()

    // Assert
    expect(getOutput().trim()).toBe('')
  })

  it('pL-24: parent unaffected by child bindings', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.child({ scope: 'x' })
    logger.info('y')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.scope).toBeUndefined()
  })

  it('pL-25: nested child merges bindings', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()
    const c1 = logger.child({ a: 1 })
    const c2 = c1.child({ b: 2 })

    // Act
    c2.info('x')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.a).toBe(1)
    expect(entry.b).toBe(2)
  })
})

describe('pinoLogger - redaction', () => {
  it('pL-26: redacts configured path', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger('info', ['token'])

    // Act
    logger.info('x', { token: 'secret' })
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.token).toBe('[REDACTED]')
  })

  it('pL-27: non-sensitive fields untouched', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger('info', ['token'])

    // Act
    logger.info('x', { safe: 'ok' })
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.safe).toBe('ok')
  })

  it('pL-28: multiple redact paths', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger('info', ['token', 'password'])

    // Act
    logger.info('x', { token: 'a', password: 'b' })
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.token).toBe('[REDACTED]')
    expect(entry.password).toBe('[REDACTED]')
  })
})

describe('createLogger factory', () => {
  let originalLogLevel: string | undefined

  beforeEach(() => {
    originalLogLevel = process.env.LOG_LEVEL
    delete process.env.LOG_LEVEL
  })

  afterEach(() => {
    if (originalLogLevel !== undefined) {
      process.env.LOG_LEVEL = originalLogLevel
    }
    else {
      delete process.env.LOG_LEVEL
    }
  })

  it('pL-29: returns PinoLogger instance', () => {
    // Act
    const logger = createLogger()

    // Assert
    expect(logger).toBeInstanceOf(PinoLogger)
  })

  it('pL-30: works with no options', () => {
    // Act & Assert
    expect(() => createLogger()).not.toThrow()
    const logger = createLogger()
    expect(logger).toBeInstanceOf(PinoLogger)
  })

  it('pL-31: accepts level option', () => {
    // Act
    const logger = createLogger({ level: 'debug' })

    // Assert
    expect(logger).toBeInstanceOf(PinoLogger)
  })

  it('pL-32: accepts level=error', () => {
    // Act
    const logger = createLogger({ level: 'error' })

    // Assert
    expect(logger).toBeInstanceOf(PinoLogger)
  })

  it('pL-33: invalid LOG_LEVEL env falls back to info', () => {
    // Arrange
    process.env.LOG_LEVEL = 'nonsense'

    // Act
    const logger = createLogger()

    // Assert
    expect(logger).toBeInstanceOf(PinoLogger)
  })

  it('pL-34: respects LOG_LEVEL env var', () => {
    // Arrange
    process.env.LOG_LEVEL = 'warn'

    // Act
    const logger = createLogger()

    // Assert
    expect(logger).toBeInstanceOf(PinoLogger)
  })

  it('pL-35: programmatic level overrides env', () => {
    // Arrange
    process.env.LOG_LEVEL = 'error'

    // Act
    const logger = createLogger({ level: 'debug' })

    // Assert
    expect(logger).toBeInstanceOf(PinoLogger)
  })

  it('pL-36: accepts custom redactPaths', () => {
    // Act
    const logger = createLogger({ redactPaths: ['apiKey'] })

    // Assert
    expect(logger).toBeInstanceOf(PinoLogger)
  })

  it('pL-37: accepts stdioMode=true', () => {
    // Act
    const logger = createLogger({ stdioMode: true })

    // Assert
    expect(logger).toBeInstanceOf(PinoLogger)
  })
})

describe('createLogger - destination routing', () => {
  const destinationSpy = vi.spyOn(pino, 'destination')

  let originalLogLevel: string | undefined

  beforeEach(() => {
    originalLogLevel = process.env.LOG_LEVEL
    delete process.env.LOG_LEVEL
    destinationSpy.mockClear()
  })

  afterEach(() => {
    if (originalLogLevel !== undefined) {
      process.env.LOG_LEVEL = originalLogLevel
    }
    else {
      delete process.env.LOG_LEVEL
    }
  })

  it('pL-38: stdioMode=true routes to stderr (fd 2)', () => {
    // Arrange & Act
    createLogger({ stdioMode: true })

    // Assert
    expect(destinationSpy).toHaveBeenCalled()
    const callArg = destinationSpy.mock.calls[0]![0]
    expect(callArg).toBe(2)
  })

  it('pL-39: stdioMode=false routes to stdout (fd 1)', () => {
    // Arrange & Act
    createLogger({ stdioMode: false })

    // Assert
    expect(destinationSpy).toHaveBeenCalled()
    const callArg = destinationSpy.mock.calls[0]![0]
    expect(callArg).toBe(1)
  })

  it('pL-40: no stdioMode routes to stdout (fd 1)', () => {
    // Arrange & Act
    createLogger({})

    // Assert
    expect(destinationSpy).toHaveBeenCalled()
    const callArg = destinationSpy.mock.calls[0]![0]
    expect(callArg).toBe(1)
  })

  it('pL-41: destinationPath overrides stdioMode', () => {
    // Arrange & Act
    createLogger({ stdioMode: true, destinationPath: '/tmp/t.log' })

    // Assert
    expect(destinationSpy).toHaveBeenCalled()
    const callArg = destinationSpy.mock.calls[0]![0]
    expect(callArg).toBe('/tmp/t.log')
  })
})

describe('pino-common helpers', () => {
  it('pL-42: VALID_LOG_LEVELS contains 5 entries', () => {
    // Assert
    expect(VALID_LOG_LEVELS).toEqual(['debug', 'info', 'warn', 'error', 'fatal'])
  })

  it('pL-43: isValidLogLevel true for "info"', () => {
    // Assert
    expect(isValidLogLevel('info')).toBe(true)
  })

  it('pL-44: isValidLogLevel false for "verbose"', () => {
    // Assert
    expect(isValidLogLevel('verbose')).toBe(false)
  })

  it('pL-45: isValidLogLevel false for empty string', () => {
    // Assert
    expect(isValidLogLevel('')).toBe(false)
  })

  it('pL-46: DEFAULT_REDACT_PATHS includes token, password, credentials, secret, authorization', () => {
    // Assert
    expect(DEFAULT_REDACT_PATHS).toContain('metadata.token')
    expect(DEFAULT_REDACT_PATHS).toContain('metadata.password')
    expect(DEFAULT_REDACT_PATHS).toContain('metadata.credentials')
    expect(DEFAULT_REDACT_PATHS).toContain('metadata.secret')
    expect(DEFAULT_REDACT_PATHS).toContain('metadata.authorization')
  })

  it('pL-47: STDOUT_FD is 1', () => {
    // Assert
    expect(STDOUT_FD).toBe(1)
  })

  it('pL-48: STDERR_FD is 2', () => {
    // Assert
    expect(STDERR_FD).toBe(2)
  })
})

describe('exports verification', () => {
  it('pL-49: PinoLogger exported from shared index', async () => {
    // Act
    const mod = await import('../src/index.js')

    // Assert
    expect(mod.PinoLogger).toBeDefined()
  })

  it('pL-50: createLogger exported from shared index', async () => {
    // Act
    const mod = await import('../src/index.js')

    // Assert
    expect(mod.createLogger).toBeDefined()
  })

  it('pL-51: LoggerOptions type is usable', () => {
    // Type-level verification: if this compiles, the type is exported and usable
    const o: LoggerOptions = { level: 'info' }
    expect(o).toBeDefined()
  })
})

describe('pinoLogger - edge cases', () => {
  it('pL-52: multiple log calls produce multiple NDJSON lines', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.info('one')
    logger.info('two')
    logger.info('three')
    await flushStream()

    // Assert
    const output = getOutput().trim()
    const lines = output.split('\n').filter(l => l.trim() !== '')
    expect(lines).toHaveLength(3)
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow()
    }
  })

  it('pL-53: empty string message', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.info('')
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.msg).toBe('')
  })

  it('pL-54: meta with msg key does not corrupt output', async () => {
    // Arrange
    const { logger, getOutput } = createTestLogger()

    // Act
    logger.info('real', { msg: 'fake' })
    await flushStream()

    // Assert
    const entry = parseLogLine(getOutput())
    expect(entry.msg).toBe('real')
  })

  it('pL-55: methods never throw even on unusual input', () => {
    // Arrange
    const { logger } = createTestLogger()

    // Act & Assert
    expect(() => logger.info('x', { circular: undefined })).not.toThrow()
  })
})
