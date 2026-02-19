import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryEpicRepository } from '../../src/adapters/in-memory-epic-repository.js'
import { ConflictError, ValidationError } from '../../src/errors/domain-errors.js'
import { CreateEpicUseCase } from '../../src/use-cases/index.js'
import { TEST_ISSUE_ID, TEST_MILESTONE_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('createEpicUseCase', () => {
  let epicRepository: InMemoryEpicRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: CreateEpicUseCase

  beforeEach(() => {
    epicRepository = new InMemoryEpicRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new CreateEpicUseCase(epicRepository, auditLogger)
  })

  it('cE-01: creates epic with milestoneId and title', async () => {
    // Arrange
    const input = { milestoneId: TEST_MILESTONE_ID, title: 'E1' }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBeDefined()
      expect(result.value.title).toBe('E1')
      expect(result.value.status).toBe('open')
      expect(result.value.createdAt).toBeInstanceOf(Date)
      expect(result.value.updatedAt).toBeInstanceOf(Date)
    }
  })

  it('cE-02: returns ValidationError for missing title', async () => {
    // Arrange
    const input = { milestoneId: TEST_MILESTONE_ID }

    // Act
    const result = await useCase.execute(input as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cE-03: returns ValidationError for empty title', async () => {
    // Arrange
    const input = { milestoneId: TEST_MILESTONE_ID, title: '' }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cE-04: returns ValidationError for missing milestoneId', async () => {
    // Arrange
    const input = { title: 'X' }

    // Act
    const result = await useCase.execute(input as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cE-05: returns ValidationError for invalid milestoneId', async () => {
    // Arrange
    const input = { milestoneId: 'bad', title: 'X' }

    // Act
    const result = await useCase.execute(input as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cE-06: defaults applied for minimal input', async () => {
    // Arrange
    const input = { milestoneId: TEST_MILESTONE_ID, title: 'Minimal' }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBe('')
      expect(result.value.issueIds).toEqual([])
      expect(result.value.status).toBe('open')
      expect(result.value.metadata).toEqual({})
    }
  })

  it('cE-07: optional fields preserved', async () => {
    // Arrange
    const input = {
      milestoneId: TEST_MILESTONE_ID,
      title: 'Full',
      description: 'A description',
      status: 'in_progress',
      issueIds: [TEST_ISSUE_ID],
    }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBe('A description')
      expect(result.value.status).toBe('in_progress')
      expect(result.value.issueIds).toEqual([TEST_ISSUE_ID])
    }
  })

  it('cE-08: title at max 500 chars accepted', async () => {
    // Arrange
    const input = { milestoneId: TEST_MILESTONE_ID, title: 'a'.repeat(500) }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.title.length).toBe(500)
    }
  })

  it('cE-09: title over 500 chars rejected', async () => {
    // Arrange
    const input = { milestoneId: TEST_MILESTONE_ID, title: 'a'.repeat(501) }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cE-10: catches ConflictError', async () => {
    // Arrange
    const input = { milestoneId: TEST_MILESTONE_ID, title: 'Conflict' }
    epicRepository.create = async () => {
      throw new ConflictError('Epic', 'x', 'duplicate title')
    }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ConflictError)
      expect(result.error.code).toBe('CONFLICT')
    }
  })

  it('cE-11: audit metadata has epicId and milestoneId', async () => {
    // Arrange
    const input = { milestoneId: TEST_MILESTONE_ID, title: 'Audited' }

    // Act
    await useCase.execute(input, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.operation).toBe('CreateEpic')
    expect(entries[0]!.userId).toBe(TEST_USER_ID)
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.epicId).toBeDefined()
    expect(metadata.milestoneId).toBeDefined()
  })

  it('cE-pattern: does not log audit on validation failure', async () => {
    // Arrange
    const input = { milestoneId: TEST_MILESTONE_ID, title: '' }

    // Act
    await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('cE-pattern: returns ValidationError for null input', async () => {
    // Act
    const result = await useCase.execute(null as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cE-pattern: returns ValidationError for number input', async () => {
    // Act
    const result = await useCase.execute(42 as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('eC-02: returns ValidationError for undefined input', async () => {
    // Act
    const result = await useCase.execute(undefined as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cE-pattern: rethrows non-domain errors', async () => {
    // Arrange
    const input = { milestoneId: TEST_MILESTONE_ID, title: 'Crash' }
    epicRepository.create = async () => {
      throw new Error('DB down')
    }

    // Act & Assert
    await expect(useCase.execute(input, TEST_USER_ID)).rejects.toThrow('DB down')
  })
})
