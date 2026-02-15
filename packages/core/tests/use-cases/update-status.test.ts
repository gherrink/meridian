import type { IssueId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryIssueRepository } from '../../src/adapters/in-memory-issue-repository.js'
import { NotFoundError, ValidationError } from '../../src/errors/domain-errors.js'
import { UpdateStatusUseCase } from '../../src/use-cases/index.js'
import { createIssueFixture, TEST_ISSUE_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('updateStatusUseCase', () => {
  let issueRepository: InMemoryIssueRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: UpdateStatusUseCase

  beforeEach(() => {
    issueRepository = new InMemoryIssueRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new UpdateStatusUseCase(issueRepository, auditLogger)
  })

  it('uS-01: updates status of existing issue', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture({ status: 'open' })])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, 'closed', TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe('closed')
    }
  })

  it('uS-02: returns NotFoundError for unknown issue', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as IssueId

    // Act
    const result = await useCase.execute(unknownId, 'closed', TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('uS-03: returns ValidationError for invalid status', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, 'invalid_value', TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
      expect((result.error as ValidationError).field).toBe('status')
    }
  })

  it('uS-04: logs audit with old and new status', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture({ status: 'open' })])

    // Act
    await useCase.execute(TEST_ISSUE_ID, 'in_progress', TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.oldStatus).toBe('open')
    expect(metadata.newStatus).toBe('in_progress')
  })

  it('uS-05: allows same status (no-op update)', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture({ status: 'open' })])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, 'open', TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe('open')
    }
  })

  it('uS-06: does not log audit on validation error', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])

    // Act
    await useCase.execute(TEST_ISSUE_ID, 'invalid_status', TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('aU-02: audit timestamp is a Date', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture({ status: 'open' })])

    // Act
    await useCase.execute(TEST_ISSUE_ID, 'closed', TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.timestamp).toBeInstanceOf(Date)
  })

  it('aU-05: no audit on NotFound', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as IssueId

    // Act
    await useCase.execute(unknownId, 'closed', TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })
})
