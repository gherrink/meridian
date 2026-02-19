import type { MilestoneId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryMilestoneRepository } from '../../src/adapters/in-memory-milestone-repository.js'
import { NotFoundError, ValidationError } from '../../src/errors/domain-errors.js'
import { UpdateMilestoneUseCase } from '../../src/use-cases/index.js'
import { createMilestoneFixture, TEST_MILESTONE_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('updateMilestoneUseCase', () => {
  let milestoneRepository: InMemoryMilestoneRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: UpdateMilestoneUseCase

  beforeEach(() => {
    milestoneRepository = new InMemoryMilestoneRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new UpdateMilestoneUseCase(milestoneRepository, auditLogger)
  })

  it('uM-01: updates name', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])

    // Act
    const result = await useCase.execute(TEST_MILESTONE_ID, { name: 'New Name' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('New Name')
    }
  })

  it('uM-02: empty name rejected', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])

    // Act
    const result = await useCase.execute(TEST_MILESTONE_ID, { name: '' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('uM-03: name over 200 chars rejected', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])

    // Act
    const result = await useCase.execute(TEST_MILESTONE_ID, { name: 'a'.repeat(201) }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('uM-04: name at 200 chars accepted', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])

    // Act
    const result = await useCase.execute(TEST_MILESTONE_ID, { name: 'a'.repeat(200) }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name.length).toBe(200)
    }
  })

  it('uM-05: updates description', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])

    // Act
    const result = await useCase.execute(TEST_MILESTONE_ID, { description: 'New desc' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBe('New desc')
    }
  })

  it('uM-pattern: preserves unmodified fields', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture({ description: 'Keep me' })])

    // Act
    const result = await useCase.execute(TEST_MILESTONE_ID, { name: 'New Name' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBe('Keep me')
    }
  })

  it('uM-pattern: returns NotFoundError for unknown milestone', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as MilestoneId

    // Act
    const result = await useCase.execute(unknownId, { name: 'Nope' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('uM-pattern: logs audit on valid update', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])

    // Act
    await useCase.execute(TEST_MILESTONE_ID, { name: 'Changed' }, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.operation).toBe('UpdateMilestone')
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.updatedFields).toBeDefined()
  })

  it('uM-pattern: audit has updatedFields with both field names', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])

    // Act
    await useCase.execute(TEST_MILESTONE_ID, { name: 'Changed', description: 'New' }, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    const metadata = entries[0]!.metadata as Record<string, unknown>
    const updatedFields = metadata.updatedFields as string[]
    expect(updatedFields).toContain('name')
    expect(updatedFields).toContain('description')
  })

  it('uM-pattern: empty update has empty updatedFields', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])

    // Act
    await useCase.execute(TEST_MILESTONE_ID, {}, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.updatedFields).toEqual([])
  })

  it('uM-pattern: no audit on not found', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as MilestoneId

    // Act
    await useCase.execute(unknownId, { name: 'Nope' }, TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('uM-pattern: rethrows non-domain errors', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])
    milestoneRepository.update = async () => {
      throw new Error('DB down')
    }

    // Act & Assert
    await expect(
      useCase.execute(TEST_MILESTONE_ID, { name: 'Changed' }, TEST_USER_ID),
    ).rejects.toThrow('DB down')
  })
})
