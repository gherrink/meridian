import type { User } from '../../src/model/user.js'
import type { UserId } from '../../src/model/value-objects.js'

import { describe, expect, it } from 'vitest'
import { AuthorizationError, NotFoundError } from '../../src/errors/domain-errors.js'
import { InMemoryUserRepository } from '../../src/adapters/in-memory-user-repository.js'
import {
  createUserFixture,
  TEST_USER_ID,
} from '../helpers/fixtures.js'

describe('InMemoryUserRepository', () => {
  describe('getById', () => {
    it('returns the user when it exists', async () => {
      // Arrange
      const user = createUserFixture()
      const repository = new InMemoryUserRepository()
      repository.seed([user])

      // Act
      const found = await repository.getById(TEST_USER_ID)

      // Assert
      expect(found).toEqual(user)
    })

    it('throws NotFoundError when user does not exist', async () => {
      // Arrange
      const repository = new InMemoryUserRepository()
      const fakeId = '00000000-0000-0000-0000-000000000000' as UserId

      // Act & Assert
      await expect(repository.getById(fakeId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('getCurrent', () => {
    it('returns the configured current user', async () => {
      // Arrange
      const currentUser = createUserFixture()
      const repository = new InMemoryUserRepository(currentUser)

      // Act
      const result = await repository.getCurrent()

      // Assert
      expect(result).toEqual(currentUser)
    })

    it('throws AuthorizationError when no current user is configured', async () => {
      // Arrange
      const repository = new InMemoryUserRepository()

      // Act & Assert
      await expect(repository.getCurrent()).rejects.toThrow(AuthorizationError)
    })

    it('returns user set via setCurrentUser', async () => {
      // Arrange
      const repository = new InMemoryUserRepository()
      const user = createUserFixture()
      repository.setCurrentUser(user)

      // Act
      const result = await repository.getCurrent()

      // Assert
      expect(result).toEqual(user)
    })

    it('also adds the current user to the store for getById', async () => {
      // Arrange
      const repository = new InMemoryUserRepository()
      const user = createUserFixture()
      repository.setCurrentUser(user)

      // Act
      const found = await repository.getById(TEST_USER_ID)

      // Assert
      expect(found).toEqual(user)
    })
  })

  describe('search', () => {
    it('finds users by name (case-insensitive)', async () => {
      // Arrange
      const repository = new InMemoryUserRepository()
      const alice = createUserFixture({
        id: '550e8400-e29b-41d4-a716-000000000001' as UserId,
        name: 'Alice Smith',
      })
      const bob = createUserFixture({
        id: '550e8400-e29b-41d4-a716-000000000002' as UserId,
        name: 'Bob Jones',
      })
      repository.seed([alice, bob])

      // Act
      const result = await repository.search('alice', { page: 1, limit: 10 })

      // Assert
      expect(result.items).toHaveLength(1)
      expect(result.items[0]!.name).toBe('Alice Smith')
    })

    it('finds users by email (case-insensitive)', async () => {
      // Arrange
      const repository = new InMemoryUserRepository()
      const user = createUserFixture({
        id: '550e8400-e29b-41d4-a716-000000000001' as UserId,
        name: 'Someone',
        email: 'Alice@Example.com',
      })
      repository.seed([user])

      // Act
      const result = await repository.search('alice@example', { page: 1, limit: 10 })

      // Assert
      expect(result.items).toHaveLength(1)
    })

    it('returns empty result when no users match', async () => {
      // Arrange
      const repository = new InMemoryUserRepository()
      repository.seed([createUserFixture()])

      // Act
      const result = await repository.search('nonexistent', { page: 1, limit: 10 })

      // Assert
      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('paginates search results', async () => {
      // Arrange
      const repository = new InMemoryUserRepository()
      const users: User[] = [
        createUserFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as UserId, name: 'Team Alice' }),
        createUserFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as UserId, name: 'Team Bob' }),
        createUserFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as UserId, name: 'Team Charlie' }),
      ]
      repository.seed(users)

      // Act
      const result = await repository.search('Team', { page: 1, limit: 2 })

      // Assert
      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(3)
      expect(result.hasMore).toBe(true)
    })

    it('sorts search results by name by default', async () => {
      // Arrange
      const repository = new InMemoryUserRepository()
      const charlie = createUserFixture({
        id: '550e8400-e29b-41d4-a716-000000000001' as UserId,
        name: 'Charlie',
      })
      const alice = createUserFixture({
        id: '550e8400-e29b-41d4-a716-000000000002' as UserId,
        name: 'Alice',
      })
      repository.seed([charlie, alice])

      // Act
      const result = await repository.search('', { page: 1, limit: 10 })

      // Assert
      // Default sort for users is 'name' descending
      expect(result.items[0]!.name).toBe('Charlie')
      expect(result.items[1]!.name).toBe('Alice')
    })
  })

  describe('seed', () => {
    it('populates the store with provided users', async () => {
      // Arrange
      const repository = new InMemoryUserRepository()
      repository.seed([createUserFixture()])

      // Act
      const found = await repository.getById(TEST_USER_ID)

      // Assert
      expect(found.name).toBe('Test User')
    })
  })

  describe('reset', () => {
    it('clears all data and the current user', async () => {
      // Arrange
      const repository = new InMemoryUserRepository(createUserFixture())
      repository.seed([
        createUserFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as UserId, name: 'Extra' }),
      ])

      // Act
      repository.reset()

      // Assert
      await expect(repository.getById(TEST_USER_ID)).rejects.toThrow(NotFoundError)
      await expect(repository.getCurrent()).rejects.toThrow(AuthorizationError)
    })
  })
})
