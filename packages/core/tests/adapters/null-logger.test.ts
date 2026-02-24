import type { ILogger } from '../../src/ports/logger.js'

import { describe, expect, it } from 'vitest'

import { NullLogger } from '../../src/adapters/null-logger.js'

describe('nullLogger', () => {
  it('nL-01: implements ILogger interface', () => {
    // Arrange
    const logger: ILogger = new NullLogger()

    // Assert
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.child).toBe('function')
  })

  it('nL-02: debug() returns void', () => {
    // Arrange
    const logger = new NullLogger()

    // Act
    const result = logger.debug('x')

    // Assert
    expect(result).toBeUndefined()
  })

  it('nL-03: info() returns void', () => {
    // Arrange
    const logger = new NullLogger()

    // Act
    const result = logger.info('x')

    // Assert
    expect(result).toBeUndefined()
  })

  it('nL-04: warn() returns void', () => {
    // Arrange
    const logger = new NullLogger()

    // Act
    const result = logger.warn('x')

    // Assert
    expect(result).toBeUndefined()
  })

  it('nL-05: error() returns void', () => {
    // Arrange
    const logger = new NullLogger()

    // Act
    const result = logger.error('x')

    // Assert
    expect(result).toBeUndefined()
  })

  it('nL-06: methods accept meta without error', () => {
    // Arrange
    const logger = new NullLogger()

    // Act & Assert
    expect(() => logger.info('x', { key: 'val' })).not.toThrow()
  })

  it('nL-07: child() returns ILogger', () => {
    // Arrange
    const logger = new NullLogger()

    // Act
    const child = logger.child({ a: 1 })

    // Assert
    expect(typeof child.debug).toBe('function')
    expect(typeof child.info).toBe('function')
    expect(typeof child.warn).toBe('function')
    expect(typeof child.error).toBe('function')
    expect(typeof child.child).toBe('function')
  })

  it('nL-08: child() returns same instance (this)', () => {
    // Arrange
    const logger = new NullLogger()

    // Act
    const child = logger.child({})

    // Assert
    expect(child).toBe(logger)
  })

  it('nL-09: NullLogger exported from core adapters index', async () => {
    // Act
    const mod = await import('../../src/adapters/index.js')

    // Assert
    expect(mod.NullLogger).toBeDefined()
  })
})
