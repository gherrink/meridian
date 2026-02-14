import type { UserId } from '../model/value-objects.js'

/**
 * Port interface for audit logging of domain operations.
 *
 * Implementations record who performed what operation and when,
 * with optional metadata for contextual details.
 */
export interface IAuditLogger {
  /**
   * Logs an audit entry for a domain operation.
   *
   * @param operation - The name of the operation (e.g., 'CreateIssue', 'AssignIssue')
   * @param userId - The user who performed the operation
   * @param metadata - Optional additional context about the operation
   */
  log: (operation: string, userId: UserId, metadata?: Record<string, unknown>) => Promise<void>
}
