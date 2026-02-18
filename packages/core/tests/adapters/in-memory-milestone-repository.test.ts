import type { CreateMilestoneInput, Milestone } from '../../src/model/milestone.js'
import type { MilestoneId } from '../../src/model/value-objects.js'

import { describe, expect, it } from 'vitest'
import { InMemoryMilestoneRepository } from '../../src/adapters/in-memory-milestone-repository.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import {
  createMilestoneFixture,
  TEST_MILESTONE_ID,
} from '../helpers/fixtures.js'

describe('inMemoryMilestoneRepository', () => {
  describe('create', () => {
    it('creates a milestone with generated ID and timestamps', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()
      const input: CreateMilestoneInput = { name: 'My Milestone' }

      // Act
      const created = await repository.create(input)

      // Assert
      expect(created.id).toBeDefined()
      expect(created.name).toBe('My Milestone')
      expect(created.description).toBe('')
      expect(created.metadata).toEqual({})
      expect(created.createdAt).toBeInstanceOf(Date)
      expect(created.updatedAt).toBeInstanceOf(Date)
    })

    it('applies defaults for optional fields', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()

      // Act
      const created = await repository.create({ name: 'Minimal' })

      // Assert
      expect(created.description).toBe('')
      expect(created.metadata).toEqual({})
    })

    it('preserves provided optional fields', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()
      const input: CreateMilestoneInput = {
        name: 'Full Milestone',
        description: 'A milestone with description',
        metadata: { team: 'alpha' },
      }

      // Act
      const created = await repository.create(input)

      // Assert
      expect(created.description).toBe('A milestone with description')
      expect(created.metadata).toEqual({ team: 'alpha' })
    })

    it('generates unique IDs for each milestone', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()

      // Act
      const first = await repository.create({ name: 'First' })
      const second = await repository.create({ name: 'Second' })

      // Assert
      expect(first.id).not.toBe(second.id)
    })
  })

  describe('getById', () => {
    it('returns the milestone when it exists', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()
      const created = await repository.create({ name: 'Findable' })

      // Act
      const found = await repository.getById(created.id)

      // Assert
      expect(found).toEqual(created)
    })

    it('throws NotFoundError when milestone does not exist', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()
      const fakeId = '00000000-0000-0000-0000-000000000000' as MilestoneId

      // Act & Assert
      await expect(repository.getById(fakeId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('update', () => {
    it('updates specified fields and preserves others', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()
      const created = await repository.create({
        name: 'Original',
        description: 'Original description',
      })

      // Act
      const updated = await repository.update(created.id, { name: 'Updated' })

      // Assert
      expect(updated.name).toBe('Updated')
      expect(updated.description).toBe('Original description')
    })

    it('updates the updatedAt timestamp', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()
      const created = await repository.create({ name: 'Timestamped' })
      const originalUpdatedAt = created.updatedAt

      // Act
      const updated = await repository.update(created.id, { name: 'Changed' })

      // Assert
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime())
      expect(updated.createdAt).toEqual(created.createdAt)
    })

    it('does not overwrite fields with undefined', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()
      const created = await repository.create({
        name: 'Keep Name',
        description: 'Keep Description',
      })

      // Act
      const updated = await repository.update(created.id, { description: 'New Description' })

      // Assert
      expect(updated.name).toBe('Keep Name')
      expect(updated.description).toBe('New Description')
    })

    it('throws NotFoundError when milestone does not exist', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()
      const fakeId = '00000000-0000-0000-0000-000000000000' as MilestoneId

      // Act & Assert
      await expect(repository.update(fakeId, { name: 'Nope' })).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('removes the milestone from the store', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()
      const created = await repository.create({ name: 'Doomed' })

      // Act
      await repository.delete(created.id)

      // Assert
      await expect(repository.getById(created.id)).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when milestone does not exist', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()
      const fakeId = '00000000-0000-0000-0000-000000000000' as MilestoneId

      // Act & Assert
      await expect(repository.delete(fakeId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('list', () => {
    describe('pagination', () => {
      it('returns all milestones on a single page', async () => {
        // Arrange
        const repository = new InMemoryMilestoneRepository()
        await repository.create({ name: 'Milestone A' })
        await repository.create({ name: 'Milestone B' })

        // Act
        const result = await repository.list({ page: 1, limit: 10 })

        // Assert
        expect(result.items).toHaveLength(2)
        expect(result.total).toBe(2)
        expect(result.page).toBe(1)
        expect(result.limit).toBe(10)
        expect(result.hasMore).toBe(false)
      })

      it('returns paginated results with hasMore', async () => {
        // Arrange
        const repository = new InMemoryMilestoneRepository()
        await repository.create({ name: 'Milestone 1' })
        await repository.create({ name: 'Milestone 2' })
        await repository.create({ name: 'Milestone 3' })

        // Act
        const result = await repository.list({ page: 1, limit: 2 })

        // Assert
        expect(result.items).toHaveLength(2)
        expect(result.total).toBe(3)
        expect(result.hasMore).toBe(true)
      })

      it('returns empty items for beyond-range pages', async () => {
        // Arrange
        const repository = new InMemoryMilestoneRepository()
        await repository.create({ name: 'Solo' })

        // Act
        const result = await repository.list({ page: 5, limit: 10 })

        // Assert
        expect(result.items).toHaveLength(0)
        expect(result.total).toBe(1)
        expect(result.hasMore).toBe(false)
      })

      it('returns empty result for empty store', async () => {
        // Arrange
        const repository = new InMemoryMilestoneRepository()

        // Act
        const result = await repository.list({ page: 1, limit: 10 })

        // Assert
        expect(result.items).toHaveLength(0)
        expect(result.total).toBe(0)
        expect(result.hasMore).toBe(false)
      })
    })

    describe('sorting', () => {
      it('sorts by createdAt descending by default', async () => {
        // Arrange
        const repository = new InMemoryMilestoneRepository()
        const older: Milestone = createMilestoneFixture({
          id: '550e8400-e29b-41d4-a716-000000000001' as MilestoneId,
          name: 'Older',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        })
        const newer: Milestone = createMilestoneFixture({
          id: '550e8400-e29b-41d4-a716-000000000002' as MilestoneId,
          name: 'Newer',
          createdAt: new Date('2025-06-01'),
          updatedAt: new Date('2025-06-01'),
        })
        repository.seed([older, newer])

        // Act
        const result = await repository.list({ page: 1, limit: 10 })

        // Assert
        expect(result.items[0]!.name).toBe('Newer')
        expect(result.items[1]!.name).toBe('Older')
      })

      it('sorts by name ascending when specified', async () => {
        // Arrange
        const repository = new InMemoryMilestoneRepository()
        const milestoneB: Milestone = createMilestoneFixture({
          id: '550e8400-e29b-41d4-a716-000000000001' as MilestoneId,
          name: 'Bravo',
        })
        const milestoneA: Milestone = createMilestoneFixture({
          id: '550e8400-e29b-41d4-a716-000000000002' as MilestoneId,
          name: 'Alpha',
        })
        repository.seed([milestoneB, milestoneA])

        // Act
        const result = await repository.list(
          { page: 1, limit: 10 },
          { field: 'name', direction: 'asc' },
        )

        // Assert
        expect(result.items[0]!.name).toBe('Alpha')
        expect(result.items[1]!.name).toBe('Bravo')
      })
    })
  })

  describe('seed', () => {
    it('populates the store with provided milestones', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()
      const milestone = createMilestoneFixture()
      repository.seed([milestone])

      // Act
      const found = await repository.getById(TEST_MILESTONE_ID)

      // Assert
      expect(found).toEqual(milestone)
    })

    it('makes seeded milestones available via list', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()
      repository.seed([createMilestoneFixture()])

      // Act
      const result = await repository.list({ page: 1, limit: 10 })

      // Assert
      expect(result.total).toBe(1)
    })
  })

  describe('reset', () => {
    it('clears all data from the store', async () => {
      // Arrange
      const repository = new InMemoryMilestoneRepository()
      repository.seed([createMilestoneFixture()])

      // Act
      repository.reset()
      const result = await repository.list({ page: 1, limit: 10 })

      // Assert
      expect(result.total).toBe(0)
    })
  })
})
