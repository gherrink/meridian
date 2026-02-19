import type { EpicId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryEpicRepository } from '../../src/adapters/in-memory-epic-repository.js'
import { ListEpicsUseCase } from '../../src/use-cases/index.js'
import { createEpicFixture } from '../helpers/fixtures.js'

describe('listEpicsUseCase', () => {
  let epicRepository: InMemoryEpicRepository
  let useCase: ListEpicsUseCase

  beforeEach(() => {
    epicRepository = new InMemoryEpicRepository()
    useCase = new ListEpicsUseCase(epicRepository)
  })

  it('lE-pattern: returns paginated result', async () => {
    // Arrange
    epicRepository.seed([
      createEpicFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as EpicId }),
      createEpicFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as EpicId }),
      createEpicFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as EpicId }),
    ])

    // Act
    const result = await useCase.execute({ page: 1, limit: 2 })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items).toHaveLength(2)
      expect(result.value.total).toBe(3)
      expect(result.value.hasMore).toBe(true)
    }
  })

  it('lE-pattern: empty result when no epics', async () => {
    // Act
    const result = await useCase.execute({ page: 1, limit: 10 })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items).toEqual([])
      expect(result.value.total).toBe(0)
    }
  })

  it('lE-pattern: sort ascending by title', async () => {
    // Arrange
    epicRepository.seed([
      createEpicFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as EpicId, title: 'Bravo' }),
      createEpicFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as EpicId, title: 'Alpha' }),
    ])

    // Act
    const result = await useCase.execute({ page: 1, limit: 10 }, { field: 'title', direction: 'asc' })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items[0]!.title).toBe('Alpha')
    }
  })

  it('lE-pattern: always returns success', async () => {
    // Act
    const result = await useCase.execute({ page: 1, limit: 10 })

    // Assert
    expect(result.ok).toBe(true)
  })

  it('eC-06: page 2 with limit larger than total returns empty', async () => {
    // Arrange
    epicRepository.seed([
      createEpicFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as EpicId }),
      createEpicFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as EpicId }),
    ])

    // Act
    const result = await useCase.execute({ page: 2, limit: 10 })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items).toEqual([])
      expect(result.value.total).toBe(2)
      expect(result.value.hasMore).toBe(false)
    }
  })
})
