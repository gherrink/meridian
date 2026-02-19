import type { EpicId } from '../../src/model/value-objects.js'
import type { IEpicRepository } from '../../src/ports/epic-repository.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryEpicRepository } from '../../src/adapters/in-memory-epic-repository.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import { GetEpicUseCase } from '../../src/use-cases/index.js'
import { createEpicFixture, TEST_EPIC_ID } from '../helpers/fixtures.js'

describe('getEpicUseCase', () => {
  let epicRepository: InMemoryEpicRepository
  let useCase: GetEpicUseCase

  beforeEach(() => {
    epicRepository = new InMemoryEpicRepository()
    useCase = new GetEpicUseCase(epicRepository)
  })

  it('gE-pattern: returns epic when found', async () => {
    // Arrange
    epicRepository.seed([createEpicFixture()])

    // Act
    const result = await useCase.execute(TEST_EPIC_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBe(TEST_EPIC_ID)
      expect(result.value.title).toBe('Test Epic')
    }
  })

  it('gE-pattern: returns NotFoundError for unknown epic', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as EpicId

    // Act
    const result = await useCase.execute(unknownId)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('eC-05: rethrows non-domain error from getById', async () => {
    // Arrange
    const mockRepo = {
      create: vi.fn(),
      getById: vi.fn().mockRejectedValue(new Error('network')),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as unknown as IEpicRepository
    const mockUseCase = new GetEpicUseCase(mockRepo)

    // Act & Assert
    await expect(mockUseCase.execute(TEST_EPIC_ID)).rejects.toThrow('network')
  })
})
