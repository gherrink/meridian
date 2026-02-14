export class DomainError extends Error {
  public readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = this.constructor.name
    this.code = code
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' not found`, 'NOT_FOUND')
  }
}

export class ValidationError extends DomainError {
  public readonly field: string

  constructor(field: string, message: string) {
    super(`Validation failed for '${field}': ${message}`, 'VALIDATION_ERROR')
    this.field = field
  }
}

export class ConflictError extends DomainError {
  constructor(entity: string, id: string, reason: string) {
    super(`Conflict on ${entity} '${id}': ${reason}`, 'CONFLICT')
  }
}

export class AuthorizationError extends DomainError {
  constructor(action: string, reason: string) {
    super(`Not authorized to ${action}: ${reason}`, 'AUTHORIZATION_ERROR')
  }
}
