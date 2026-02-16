import type { AuditLoggerOptions } from '../src/pino-audit-logger.js'

import process from 'node:process'

import pino from 'pino'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAuditLogger } from '../src/pino-audit-logger.js'

// Spy on pino.destination to observe how the logger routes output
const destinationSpy = vi.spyOn(pino, 'destination')

describe('pino-audit-logger - stdioMode destination routing', () => {
  let originalLogLevel: string | undefined
  let originalAuditLogPath: string | undefined

  beforeEach(() => {
    originalLogLevel = process.env.LOG_LEVEL
    originalAuditLogPath = process.env.AUDIT_LOG_PATH
    delete process.env.LOG_LEVEL
    delete process.env.AUDIT_LOG_PATH
    destinationSpy.mockClear()
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

  it('tC-25: stdioMode=true routes to stderr (fd 2)', () => {
    // Arrange & Act
    createAuditLogger({ stdioMode: true })

    // Assert
    expect(destinationSpy).toHaveBeenCalled()
    const callArg = destinationSpy.mock.calls[0]![0]
    expect(callArg).toBe(2)
  })

  it('tC-26: stdioMode=false routes to stdout (fd 1)', () => {
    // Arrange & Act
    createAuditLogger({ stdioMode: false })

    // Assert
    expect(destinationSpy).toHaveBeenCalled()
    const callArg = destinationSpy.mock.calls[0]![0]
    expect(callArg).toBe(1)
  })

  it('tC-27: stdioMode=undefined routes to stdout (fd 1)', () => {
    // Arrange & Act
    createAuditLogger({})

    // Assert
    expect(destinationSpy).toHaveBeenCalled()
    const callArg = destinationSpy.mock.calls[0]![0]
    expect(callArg).toBe(1)
  })

  it('tC-28: destinationPath takes precedence over stdioMode', () => {
    // Arrange & Act
    createAuditLogger({ stdioMode: true, destinationPath: '/tmp/test.log' })

    // Assert
    expect(destinationSpy).toHaveBeenCalled()
    const callArg = destinationSpy.mock.calls[0]![0]
    expect(callArg).toBe('/tmp/test.log')
  })

  it('tC-29: AUDIT_LOG_PATH env takes precedence over stdioMode', () => {
    // Arrange
    process.env.AUDIT_LOG_PATH = '/tmp/env.log'

    // Act
    createAuditLogger({ stdioMode: true })

    // Assert
    expect(destinationSpy).toHaveBeenCalled()
    const callArg = destinationSpy.mock.calls[0]![0]
    expect(callArg).toBe('/tmp/env.log')
  })
})

describe('pino-audit-logger - stdioMode type check', () => {
  it('tC-35: stdioMode option type in AuditLoggerOptions', () => {
    // Type-level check: if this compiles, the type accepts stdioMode
    const options: AuditLoggerOptions = { stdioMode: true }
    expect(options).toBeDefined()
    expect(options.stdioMode).toBe(true)

    // Also verify it is accepted by createAuditLogger without throwing
    expect(() => createAuditLogger(options)).not.toThrow()
  })
})
