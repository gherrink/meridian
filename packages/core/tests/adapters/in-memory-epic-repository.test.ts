import type { CreateEpicInput } from '../../src/model/epic.js'
import type { EpicId } from '../../src/model/value-objects.js'

import { describe, expect, it } from 'vitest'
import { InMemoryEpicRepository } from '../../src/adapters/in-memory-epic-repository.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import {
  createEpicFixture,
  TEST_EPIC_ID,
  TEST_MILESTONE_ID,
} from '../helpers/fixtures.js'

describe('inMemoryEpicRepository', () => {
  describe('create', () => {
    it('eR-01: creates epic with id and timestamps', async () => {
      // Arrange
      const repository = new InMemoryEpicRepository()
      const input: CreateEpicInput = { milestoneId: TEST_MILESTONE_ID, title: 'My Epic' }

      // Act
      const created = await repository.create(input)

      // Assert
      expect(typeof created.id).toBe('string')
      expect(created.title).toBe('My Epic')
      expect(created.createdAt).toBeInstanceOf(Date)
      expect(created.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('getById', () => {
    it('eR-02: returns seeded epic', async () => {
      // Arrange
      const repository = new InMemoryEpicRepository()
      repository.seed([createEpicFixture()])

      // Act
      const found = await repository.getById(TEST_EPIC_ID)

      // Assert
      expect(found.id).toBe(TEST_EPIC_ID)
      expect(found.title).toBe('Test Epic')
    })

    it('eR-03: throws NotFoundError for unknown id', async () => {
      // Arrange
      const repository = new InMemoryEpicRepository()
      const unknownId = '00000000-0000-0000-0000-000000000099' as EpicId

      // Act & Assert
      await expect(repository.getById(unknownId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('update', () => {
    it('eR-04: merges fields on update', async () => {
      // Arrange
      const repository = new InMemoryEpicRepository()
      repository.seed([createEpicFixture({ description: 'Original desc' })])

      // Act
      const updated = await repository.update(TEST_EPIC_ID, { title: 'Changed Title' })

      // Assert
      expect(updated.title).toBe('Changed Title')
      expect(updated.description).toBe('Original desc')
    })

    it('eR-05: throws NotFoundError for unknown id', async () => {
      // Arrange
      const repository = new InMemoryEpicRepository()
      const unknownId = '00000000-0000-0000-0000-000000000099' as EpicId

      // Act & Assert
      await expect(repository.update(unknownId, { title: 'Nope' })).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('eR-06: removes entity so getById throws', async () => {
      // Arrange
      const repository = new InMemoryEpicRepository()
      repository.seed([createEpicFixture()])

      // Act
      await repository.delete(TEST_EPIC_ID)

      // Assert
      await expect(repository.getById(TEST_EPIC_ID)).rejects.toThrow(NotFoundError)
    })

    it('eR-07: throws NotFoundError for unknown id', async () => {
      // Arrange
      const repository = new InMemoryEpicRepository()
      const unknownId = '00000000-0000-0000-0000-000000000099' as EpicId

      // Act & Assert
      await expect(repository.delete(unknownId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('list', () => {
    it('eR-08: returns paginated results', async () => {
      // Arrange
      const repository = new InMemoryEpicRepository()
      repository.seed([
        createEpicFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as EpicId }),
        createEpicFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as EpicId }),
        createEpicFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as EpicId }),
      ])

      // Act
      const result = await repository.list({ page: 1, limit: 2 })

      // Assert
      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(3)
      expect(result.hasMore).toBe(true)
    })
  })

  describe('seed', () => {
    it('eR-09: populates store', async () => {
      // Arrange
      const repository = new InMemoryEpicRepository()
      repository.seed([
        createEpicFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as EpicId }),
        createEpicFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as EpicId }),
      ])

      // Act
      const result = await repository.list({ page: 1, limit: 10 })

      // Assert
      expect(result.total).toBe(2)
    })
  })

  describe('reset', () => {
    it('eR-10: clears store', async () => {
      // Arrange
      const repository = new InMemoryEpicRepository()
      repository.seed([createEpicFixture()])

      // Act
      repository.reset()
      const result = await repository.list({ page: 1, limit: 10 })

      // Assert
      expect(result.total).toBe(0)
    })
  })
})
