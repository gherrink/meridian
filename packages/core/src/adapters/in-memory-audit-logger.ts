import type { UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'

export interface AuditEntry {
  operation: string
  userId: UserId
  metadata: Record<string, unknown> | undefined
  timestamp: Date
}

export class InMemoryAuditLogger implements IAuditLogger {
  private readonly entries: AuditEntry[] = []

  log = async (operation: string, userId: UserId, metadata?: Record<string, unknown>): Promise<void> => {
    this.entries.push({
      operation,
      userId,
      metadata,
      timestamp: new Date(),
    })
  }

  getEntries(): AuditEntry[] {
    return [...this.entries]
  }

  reset(): void {
    this.entries.length = 0
  }
}
