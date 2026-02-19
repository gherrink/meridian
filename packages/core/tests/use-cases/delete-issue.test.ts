import type { IssueId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryIssueRepository } from '../../src/adapters/in-memory-issue-repository.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import { DeleteIssueUseCase } from '../../src/use-cases/index.js'
import { createIssueFixture, TEST_ISSUE_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('deleteIssueUseCase', () => {
  let issueRepository: InMemoryIssueRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: DeleteIssueUseCase

  beforeEach(() => {
    issueRepository = new InMemoryIssueRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new DeleteIssueUseCase(issueRepository, auditLogger)
  })

  it('dI-pattern: deletes existing issue', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBeUndefined()
    }
  })

  it('dI-pattern: subsequent getById fails after delete', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])

    // Act
    await useCase.execute(TEST_ISSUE_ID, TEST_USER_ID)

    // Assert
    await expect(issueRepository.getById(TEST_ISSUE_ID)).rejects.toThrow(NotFoundError)
  })

  it('dI-pattern: returns NotFoundError for unknown issue', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as IssueId

    // Act
    const result = await useCase.execute(unknownId, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('dI-pattern: logs audit on valid delete', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])

    // Act
    await useCase.execute(TEST_ISSUE_ID, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.operation).toBe('DeleteIssue')
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.issueId).toBeDefined()
  })

  it('dI-pattern: no audit on not found', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as IssueId

    // Act
    await useCase.execute(unknownId, TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('eC-04: rethrows non-domain error (RangeError)', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])
    issueRepository.delete = async () => {
      throw new RangeError()
    }

    // Act & Assert
    await expect(useCase.execute(TEST_ISSUE_ID, TEST_USER_ID)).rejects.toThrow(RangeError)
  })
})
