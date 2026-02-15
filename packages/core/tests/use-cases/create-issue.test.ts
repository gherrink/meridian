import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryIssueRepository } from '../../src/adapters/in-memory-issue-repository.js'
import { ValidationError } from '../../src/errors/domain-errors.js'
import { CreateIssueUseCase } from '../../src/use-cases/index.js'
import { TEST_PROJECT_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('createIssueUseCase', () => {
  let issueRepository: InMemoryIssueRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: CreateIssueUseCase

  beforeEach(() => {
    issueRepository = new InMemoryIssueRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new CreateIssueUseCase(issueRepository, auditLogger)
  })

  it('cI-01: creates issue with valid input', async () => {
    // Arrange
    const input = { projectId: TEST_PROJECT_ID, title: 'New' }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBeDefined()
      expect(result.value.title).toBe('New')
      expect(result.value.status).toBe('open')
      expect(result.value.createdAt).toBeInstanceOf(Date)
      expect(result.value.updatedAt).toBeInstanceOf(Date)
    }
  })

  it('cI-02: returns ValidationError for missing title', async () => {
    // Arrange
    const input = { projectId: TEST_PROJECT_ID }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cI-03: returns ValidationError for empty title', async () => {
    // Arrange
    const input = { projectId: TEST_PROJECT_ID, title: '' }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cI-04: returns ValidationError for missing projectId', async () => {
    // Arrange
    const input = { title: 'No project' }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cI-05: returns ValidationError for invalid projectId', async () => {
    // Arrange
    const input = { projectId: 'not-uuid', title: 'X' }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cI-06: applies defaults for optional fields', async () => {
    // Arrange
    const input = { projectId: TEST_PROJECT_ID, title: 'Minimal' }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBe('')
      expect(result.value.priority).toBe('normal')
      expect(result.value.assigneeIds).toEqual([])
      expect(result.value.tags).toEqual([])
    }
  })

  it('cI-07: preserves provided optional fields', async () => {
    // Arrange
    const input = {
      projectId: TEST_PROJECT_ID,
      title: 'Full',
      description: 'A description',
      status: 'in_progress',
      priority: 'high',
    }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBe('A description')
      expect(result.value.status).toBe('in_progress')
      expect(result.value.priority).toBe('high')
    }
  })

  it('cI-08: logs audit entry on success', async () => {
    // Arrange
    const input = { projectId: TEST_PROJECT_ID, title: 'Audited' }

    // Act
    await useCase.execute(input, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.operation).toBe('CreateIssue')
    expect(entries[0]!.userId).toBe(TEST_USER_ID)
    expect(entries[0]!.metadata).toHaveProperty('issueId')
    expect(entries[0]!.metadata).toHaveProperty('projectId')
  })

  it('cI-09: does not log audit on validation failure', async () => {
    // Arrange
    const input = { projectId: TEST_PROJECT_ID, title: '' }

    // Act
    await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('cI-10: returns ValidationError for null input', async () => {
    // Act

    const result = await useCase.execute(null as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cI-11: returns ValidationError for number input', async () => {
    // Act

    const result = await useCase.execute(42 as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cI-12: returns ValidationError for string input', async () => {
    // Act

    const result = await useCase.execute('hello' as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('aU-01: audit metadata has projectId matching input', async () => {
    // Arrange
    const input = { projectId: TEST_PROJECT_ID, title: 'Audited' }

    // Act
    await useCase.execute(input, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.projectId).toBe(TEST_PROJECT_ID)
  })
})
