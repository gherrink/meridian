import type { DomainError } from '../errors/domain-errors.js'

export type Result<T, E extends DomainError = DomainError> =
  | { ok: true, value: T }
  | { ok: false, error: E }

export function success<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function failure<E extends DomainError>(error: E): Result<never, E> {
  return { ok: false, error }
}
