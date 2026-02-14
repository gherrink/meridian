import { describe, expect, it } from 'vitest'

import {
  AuthorizationError,
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from '../../src/errors/domain-errors.js'

describe('domainError', () => {
  it('has the correct name', () => {
    const error = new DomainError('test message', 'TEST_CODE')

    expect(error.name).toBe('DomainError')
  })

  it('has the correct message', () => {
    const error = new DomainError('test message', 'TEST_CODE')

    expect(error.message).toBe('test message')
  })

  it('has the correct code', () => {
    const error = new DomainError('test message', 'TEST_CODE')

    expect(error.code).toBe('TEST_CODE')
  })

  it('is an instance of Error', () => {
    const error = new DomainError('test', 'TEST')

    expect(error).toBeInstanceOf(Error)
  })
})

describe('notFoundError', () => {
  it('has the correct name', () => {
    const error = new NotFoundError('Issue', '123')

    expect(error.name).toBe('NotFoundError')
  })

  it('has the correct message', () => {
    const error = new NotFoundError('Issue', '123')

    expect(error.message).toBe('Issue with id \'123\' not found')
  })

  it('has the correct code', () => {
    const error = new NotFoundError('Issue', '123')

    expect(error.code).toBe('NOT_FOUND')
  })

  it('is an instance of DomainError', () => {
    const error = new NotFoundError('Issue', '123')

    expect(error).toBeInstanceOf(DomainError)
  })

  it('is an instance of Error', () => {
    const error = new NotFoundError('Issue', '123')

    expect(error).toBeInstanceOf(Error)
  })
})

describe('validationError', () => {
  it('has the correct name', () => {
    const error = new ValidationError('title', 'must not be empty')

    expect(error.name).toBe('ValidationError')
  })

  it('has the correct message', () => {
    const error = new ValidationError('title', 'must not be empty')

    expect(error.message).toBe('Validation failed for \'title\': must not be empty')
  })

  it('has the correct code', () => {
    const error = new ValidationError('title', 'must not be empty')

    expect(error.code).toBe('VALIDATION_ERROR')
  })

  it('stores the field name', () => {
    const error = new ValidationError('title', 'must not be empty')

    expect(error.field).toBe('title')
  })

  it('is an instance of DomainError', () => {
    const error = new ValidationError('title', 'must not be empty')

    expect(error).toBeInstanceOf(DomainError)
  })
})

describe('conflictError', () => {
  it('has the correct name', () => {
    const error = new ConflictError('Issue', '123', 'already exists')

    expect(error.name).toBe('ConflictError')
  })

  it('has the correct message', () => {
    const error = new ConflictError('Issue', '123', 'already exists')

    expect(error.message).toBe('Conflict on Issue \'123\': already exists')
  })

  it('has the correct code', () => {
    const error = new ConflictError('Issue', '123', 'already exists')

    expect(error.code).toBe('CONFLICT')
  })

  it('is an instance of DomainError', () => {
    const error = new ConflictError('Issue', '123', 'already exists')

    expect(error).toBeInstanceOf(DomainError)
  })
})

describe('authorizationError', () => {
  it('has the correct name', () => {
    const error = new AuthorizationError('delete issue', 'insufficient permissions')

    expect(error.name).toBe('AuthorizationError')
  })

  it('has the correct message', () => {
    const error = new AuthorizationError('delete issue', 'insufficient permissions')

    expect(error.message).toBe('Not authorized to delete issue: insufficient permissions')
  })

  it('has the correct code', () => {
    const error = new AuthorizationError('delete issue', 'insufficient permissions')

    expect(error.code).toBe('AUTHORIZATION_ERROR')
  })

  it('is an instance of DomainError', () => {
    const error = new AuthorizationError('delete issue', 'insufficient permissions')

    expect(error).toBeInstanceOf(DomainError)
  })
})
