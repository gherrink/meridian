import { beforeEach, describe, expect, it } from 'vitest'
import type { UserId } from '../../src/model/value-objects.js'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { TEST_USER_ID } from '../helpers/fixtures.js'

describe('InMemoryAuditLogger', () => {
  let auditLogger: InMemoryAuditLogger

  beforeEach(() => {
    auditLogger = new InMemoryAuditLogger()
  })

  it('AL-01: logs entry with timestamp', async () => {
    // Act
    await auditLogger.log('Op', TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.operation).toBe('Op')
    expect(entries[0]!.userId).toBe(TEST_USER_ID)
    expect(entries[0]!.timestamp).toBeInstanceOf(Date)
  })

  it('AL-02: logs with metadata', async () => {
    // Act
    await auditLogger.log('Op', TEST_USER_ID, { key: 'val' })

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries[0]!.metadata).toEqual({ key: 'val' })
  })

  it('AL-03: accumulates entries', async () => {
    // Act
    await auditLogger.log('Op1', TEST_USER_ID)
    await auditLogger.log('Op2', TEST_USER_ID)
    await auditLogger.log('Op3', TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(3)
  })

  it('AL-04: reset clears entries', async () => {
    // Arrange
    await auditLogger.log('Op', TEST_USER_ID)

    // Act
    auditLogger.reset()

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('AL-05: getEntries returns copy', async () => {
    // Arrange
    await auditLogger.log('Op', TEST_USER_ID)

    // Act
    const entries = auditLogger.getEntries()
    entries.push({
      operation: 'Fake',
      userId: TEST_USER_ID,
      metadata: undefined,
      timestamp: new Date(),
    })

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(1)
  })
})
