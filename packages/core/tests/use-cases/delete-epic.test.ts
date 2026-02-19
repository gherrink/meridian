import type { EpicId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryEpicRepository } from '../../src/adapters/in-memory-epic-repository.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import { DeleteEpicUseCase } from '../../src/use-cases/index.js'
import { createEpicFixture, TEST_EPIC_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('deleteEpicUseCase', () => {
  let epicRepository: InMemoryEpicRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: DeleteEpicUseCase

  beforeEach(() => {
    epicRepository = new InMemoryEpicRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new DeleteEpicUseCase(epicRepository, auditLogger)
  })

  it('dE-pattern: deletes existing epic', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture()])

    // Act
    const result = await useCase.execute(TEST_EPIC_ID, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBeUndefined()
    }
  })

  it('dE-pattern: subsequent getById fails after delete', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture()])

    // Act
    await useCase.execute(TEST_EPIC_ID, TEST_USER_ID)

    // Assert
    await expect(epicRepository.getById(TEST_EPIC_ID)).rejects.toThrow(NotFoundError)
  })

  it('dE-pattern: returns NotFoundError for unknown epic', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as EpicId

    // Act
    const result = await useCase.execute(unknownId, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('dE-pattern: logs audit on valid delete', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture()])

    // Act
    await useCase.execute(TEST_EPIC_ID, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.operation).toBe('DeleteEpic')
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.epicId).toBeDefined()
  })

  it('dE-pattern: no audit on not found', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as EpicId

    // Act
    await useCase.execute(unknownId, TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('dE-pattern: rethrows non-domain errors', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture()])
    epicRepository.delete = async () => {
      throw new Error('DB down')
    }

    // Act & Assert
    await expect(useCase.execute(TEST_EPIC_ID, TEST_USER_ID)).rejects.toThrow('DB down')
  })
})
