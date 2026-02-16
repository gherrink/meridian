import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../src/errors/domain-errors.js'
import { failure, success } from '../../src/use-cases/index.js'

describe('result helpers', () => {
  it('r-01: success wraps value', () => {
    // Arrange & Act
    const result = success(42)

    // Assert
    expect(result).toEqual({ ok: true, value: 42 })
  })

  it('r-02: failure wraps error', () => {
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
