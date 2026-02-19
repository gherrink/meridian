import type { EpicId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryEpicRepository } from '../../src/adapters/in-memory-epic-repository.js'
import { NotFoundError, ValidationError } from '../../src/errors/domain-errors.js'
import { UpdateEpicUseCase } from '../../src/use-cases/index.js'
import { createEpicFixture, TEST_EPIC_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('updateEpicUseCase', () => {
  let epicRepository: InMemoryEpicRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: UpdateEpicUseCase

  beforeEach(() => {
    epicRepository = new InMemoryEpicRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new UpdateEpicUseCase(epicRepository, auditLogger)
  })

  it('uE-01: updates title', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture()])

    // Act
    const result = await useCase.execute(TEST_EPIC_ID, { title: 'New' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.title).toBe('New')
    }
  })

  it('uE-02: updates status', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture()])

    // Act
    const result = await useCase.execute(TEST_EPIC_ID, { status: 'closed' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe('closed')
    }
  })

  it('uE-03: empty title rejected', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture()])

    // Act
    const result = await useCase.execute(TEST_EPIC_ID, { title: '' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('uE-04: invalid status type rejected', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture()])

    // Act
    const result = await useCase.execute(TEST_EPIC_ID, { status: 123 as any }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('uE-pattern: preserves unmodified fields', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture({ description: 'Keep me' })])

    // Act
    const result = await useCase.execute(TEST_EPIC_ID, { title: 'New Title' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBe('Keep me')
    }
  })

  it('uE-pattern: returns NotFoundError for unknown epic', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as EpicId

    // Act
    const result = await useCase.execute(unknownId, { title: 'Nope' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('uE-pattern: logs audit on valid update', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture()])

    // Act
    await useCase.execute(TEST_EPIC_ID, { title: 'Changed' }, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.operation).toBe('UpdateEpic')
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.updatedFields).toBeDefined()
  })

  it('uE-pattern: audit has updatedFields with both field names', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture()])

    // Act
    await useCase.execute(TEST_EPIC_ID, { title: 'Changed', status: 'closed' }, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    const metadata = entries[0]!.metadata as Record<string, unknown>
    const updatedFields = metadata.updatedFields as string[]
    expect(updatedFields).toContain('title')
    expect(updatedFields).toContain('status')
  })

  it('uE-pattern: empty update has empty updatedFields', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture()])

    // Act
    await useCase.execute(TEST_EPIC_ID, {}, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.updatedFields).toEqual([])
  })

  it('uE-pattern: no audit on not found', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as EpicId

    // Act
    await useCase.execute(unknownId, { title: 'Nope' }, TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('uE-pattern: rethrows non-domain errors', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture()])
    epicRepository.update = async () => {
      throw new Error('DB down')
    }

    // Act & Assert
    await expect(
      useCase.execute(TEST_EPIC_ID, { title: 'Changed' }, TEST_USER_ID),
    ).rejects.toThrow('DB down')
  })
})
