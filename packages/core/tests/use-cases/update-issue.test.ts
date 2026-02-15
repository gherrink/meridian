import type { IssueId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryIssueRepository } from '../../src/adapters/in-memory-issue-repository.js'
import { NotFoundError, ValidationError } from '../../src/errors/domain-errors.js'
import { UpdateIssueUseCase } from '../../src/use-cases/index.js'
import { createIssueFixture, TEST_ISSUE_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('updateIssueUseCase', () => {
  let issueRepository: InMemoryIssueRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: UpdateIssueUseCase

  beforeEach(() => {
    issueRepository = new InMemoryIssueRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new UpdateIssueUseCase(issueRepository, auditLogger)
  })

  it('uI-01: updates title of existing issue', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, { title: 'Changed' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.title).toBe('Changed')
    }
  })

  it('uI-02: preserves unmodified fields', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture({ description: 'Keep me' })])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, { title: 'New Title' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBe('Keep me')
    }
  })

  it('uI-03: returns NotFoundError for unknown issue', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as IssueId

    // Act
    const result = await useCase.execute(unknownId, { title: 'Nope' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('uI-04: returns ValidationError for invalid input', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, { title: '' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('uI-05: logs audit with updated field names', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])

    // Act
    await useCase.execute(TEST_ISSUE_ID, { title: 'Changed', status: 'closed' }, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    const metadata = entries[0]!.metadata as Record<string, unknown>
    const updatedFields = metadata.updatedFields as string[]
    expect(updatedFields).toContain('title')
    expect(updatedFields).toContain('status')
  })

  it('uI-06: does not log audit on not found', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as IssueId

    // Act
    await useCase.execute(unknownId, { title: 'Nope' }, TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('aU-03: updatedFields is empty array for {} input', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])

    // Act
    await useCase.execute(TEST_ISSUE_ID, {}, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.updatedFields).toEqual([])
  })

  it('eC-09: returns ValidationError for invalid status type (number)', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])

    // Act

    const result = await useCase.execute(TEST_ISSUE_ID, { status: 123 as any }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })
})
