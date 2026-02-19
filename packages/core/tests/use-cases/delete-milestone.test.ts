import type { MilestoneId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryMilestoneRepository } from '../../src/adapters/in-memory-milestone-repository.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import { DeleteMilestoneUseCase } from '../../src/use-cases/index.js'
import { createMilestoneFixture, TEST_MILESTONE_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('deleteMilestoneUseCase', () => {
  let milestoneRepository: InMemoryMilestoneRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: DeleteMilestoneUseCase

  beforeEach(() => {
    milestoneRepository = new InMemoryMilestoneRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new DeleteMilestoneUseCase(milestoneRepository, auditLogger)
  })

  it('dM-pattern: deletes existing milestone', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])

    // Act
    const result = await useCase.execute(TEST_MILESTONE_ID, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBeUndefined()
    }
  })

  it('dM-pattern: subsequent getById fails after delete', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])

    // Act
    await useCase.execute(TEST_MILESTONE_ID, TEST_USER_ID)

    // Assert
    await expect(milestoneRepository.getById(TEST_MILESTONE_ID)).rejects.toThrow(NotFoundError)
  })

  it('dM-pattern: returns NotFoundError for unknown milestone', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as MilestoneId

    // Act
    const result = await useCase.execute(unknownId, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('dM-pattern: logs audit on valid delete', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])

    // Act
    await useCase.execute(TEST_MILESTONE_ID, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.operation).toBe('DeleteMilestone')
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.milestoneId).toBeDefined()
  })

  it('dM-pattern: no audit on not found', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as MilestoneId

    // Act
    await useCase.execute(unknownId, TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('dM-pattern: rethrows non-domain errors', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])
    milestoneRepository.delete = async () => {
      throw new Error('DB down')
    }

    // Act & Assert
    await expect(useCase.execute(TEST_MILESTONE_ID, TEST_USER_ID)).rejects.toThrow('DB down')
  })
})
