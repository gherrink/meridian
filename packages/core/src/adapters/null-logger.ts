import type { ILogger } from '../ports/logger.js'

/**
 * No-op logger that silently discards all log calls.
 * Used as a default for in-memory adapters and in tests where logging is not needed.
 */
export class NullLogger implements ILogger {
  debug(_message: string, _meta?: Record<string, unknown>): void {}
  info(_message: string, _meta?: Record<string, unknown>): void {}
  warn(_message: string, _meta?: Record<string, unknown>): void {}
  error(_message: string, _meta?: Record<string, unknown>): void {}

  child(_bindings: Record<string, unknown>): ILogger {
    return this
  }
}
