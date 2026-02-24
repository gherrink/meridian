/**
 * Port interface for structured infrastructure logging.
 *
 * Separate from IAuditLogger which serves domain audit trails (operation + userId).
 * ILogger serves infrastructure concerns: API calls, warnings, debug diagnostics.
 *
 * All methods are synchronous fire-and-forget. Implementations must never throw.
 */
export interface ILogger {
  debug: (message: string, meta?: Record<string, unknown>) => void
  info: (message: string, meta?: Record<string, unknown>) => void
  warn: (message: string, meta?: Record<string, unknown>) => void
  error: (message: string, meta?: Record<string, unknown>) => void

  /**
   * Returns a child logger with the given bindings merged into every log entry.
   * Useful for adapter-scoped context (e.g., `{ adapter: 'github', owner, repo }`).
   */
  child: (bindings: Record<string, unknown>) => ILogger
}
