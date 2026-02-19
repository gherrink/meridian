import type { MilestoneId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryMilestoneRepository } from '../../src/adapters/in-memory-milestone-repository.js'
import { ListMilestonesUseCase } from '../../src/use-cases/index.js'
import { createMilestoneFixture } from '../helpers/fixtures.js'

describe('listMilestonesUseCase', () => {
  let milestoneRepository: InMemoryMilestoneRepository
  let useCase: ListMilestonesUseCase

  beforeEach(() => {
    milestoneRepository = new InMemoryMilestoneRepository()
    useCase = new ListMilestonesUseCase(milestoneRepository)
  })

  it('lM-pattern: returns paginated result', async () => {
    // Arrange
    milestoneRepository.seed([
      createMilestoneFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as MilestoneId }),
      createMilestoneFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as MilestoneId }),
      createMilestoneFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as MilestoneId }),
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

  it('lM-pattern: empty result when no milestones', async () => {
    // Act
    const result = await useCase.execute({ page: 1, limit: 10 })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items).toEqual([])
      expect(result.value.total).toBe(0)
    }
  })

  it('lM-pattern: sort ascending by name', async () => {
    // Arrange
    milestoneRepository.seed([
      createMilestoneFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as MilestoneId, name: 'Bravo' }),
      createMilestoneFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as MilestoneId, name: 'Alpha' }),
    ])

    // Act
    const result = await useCase.execute({ page: 1, limit: 10 }, { field: 'name', direction: 'asc' })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items[0]!.name).toBe('Alpha')
    }
  })

  it('lM-pattern: always returns success', async () => {
    // Act
    const result = await useCase.execute({ page: 1, limit: 10 })

    // Assert
    expect(result.ok).toBe(true)
  })
})
