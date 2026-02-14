import { describe, expect, it } from 'vitest'
import { failure, success } from '../../src/use-cases/index.js'
import { ValidationError } from '../../src/errors/domain-errors.js'

describe('Result helpers', () => {
  it('R-01: success wraps value', () => {
    // Arrange & Act
    const result = success(42)

    // Assert
    expect(result).toEqual({ ok: true, value: 42 })
  })

  it('R-02: failure wraps error', () => {
    // Arrange
    const error = new ValidationError('f', 'm')

    // Act
    const result = failure(error)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe(error)
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })
})
