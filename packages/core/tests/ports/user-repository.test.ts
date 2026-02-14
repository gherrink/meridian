import type { PaginationParams } from '../../src/model/pagination.js'

import type { IUserRepository } from '../../src/ports/user-repository.js'
import { describe, expect, it, vi } from 'vitest'
import {
  createUserFixture,
  TEST_USER_ID,
} from '../helpers/fixtures.js'

describe('iUserRepository', () => {
  function createMock(): IUserRepository {
    return {
      getById: vi.fn(),
      getCurrent: vi.fn(),
      search: vi.fn(),
    }
  }

  it('can be satisfied by a mock with all required methods', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(mock).toBeDefined()
  })

  it('defines a getById method', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(typeof mock.getById).toBe('function')
  })

  it('defines a getCurrent method', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(typeof mock.getCurrent).toBe('function')
  })

  it('defines a search method', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(typeof mock.search).toBe('function')
  })

  it('has exactly 3 methods', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(Object.keys(mock)).toHaveLength(3)
  })

  it('getById accepts UserId and returns Promise of User', async () => {
    // Arrange
    const mock = createMock()
    mock.getById = vi.fn().mockResolvedValue(createUserFixture())

    // Act
    const result = await mock.getById(TEST_USER_ID)

    // Assert
    expect(result.id).toBe(TEST_USER_ID)
    expect(result.name).toBe('Test User')
    expect(mock.getById).toHaveBeenCalledOnce()
    expect(mock.getById).toHaveBeenCalledWith(TEST_USER_ID)
  })

  it('getCurrent takes no arguments and returns Promise of User', async () => {
    // Arrange
    const mock = createMock()
    mock.getCurrent = vi.fn().mockResolvedValue(createUserFixture({ name: 'Current User' }))

    // Act
    const result = await mock.getCurrent()

    // Assert
    expect(result.name).toBe('Current User')
    expect(mock.getCurrent).toHaveBeenCalledOnce()
    expect(mock.getCurrent).toHaveBeenCalledWith()
  })

  it('search accepts query string and PaginationParams, returns PaginatedResult of User', async () => {
    // Arrange
    const mock = createMock()
    const pagination: PaginationParams = { page: 1, limit: 20 }
    mock.search = vi.fn().mockResolvedValue({
      items: [createUserFixture()],
      total: 1,
      page: 1,
      limit: 20,
      hasMore: false,
    })

    // Act
    const result = await mock.search('test', pagination)

    // Assert
    expect(result.items).toHaveLength(1)
    expect(result.items[0]!.name).toBe('Test User')
    expect(result.total).toBe(1)
    expect(mock.search).toHaveBeenCalledOnce()
    expect(mock.search).toHaveBeenCalledWith('test', pagination)
  })

  it('search returns empty result for no matches', async () => {
    // Arrange
    const mock = createMock()
    mock.search = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
    })

    // Act
    const result = await mock.search('nonexistent', { page: 1, limit: 20 })

    // Assert
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
    expect(result.hasMore).toBe(false)
  })

  it('search accepts empty string as query', async () => {
    // Arrange
    const mock = createMock()
    const pagination: PaginationParams = { page: 1, limit: 20 }
    mock.search = vi.fn().mockResolvedValue({
      items: [createUserFixture()],
      total: 1,
      page: 1,
      limit: 20,
      hasMore: false,
    })

    // Act
    await mock.search('', pagination)

    // Assert
    expect(mock.search).toHaveBeenCalledOnce()
    expect(mock.search).toHaveBeenCalledWith('', pagination)
  })

  it('getById returns user with nullable fields', async () => {
    // Arrange
    const mock = createMock()
    mock.getById = vi.fn().mockResolvedValue(createUserFixture({ email: null, avatarUrl: null }))

    // Act
    const result = await mock.getById(TEST_USER_ID)

    // Assert
    expect(result.email).toBeNull()
    expect(result.avatarUrl).toBeNull()
  })

  it('getById returns user with populated email and avatarUrl', async () => {
    // Arrange
    const mock = createMock()
    mock.getById = vi.fn().mockResolvedValue(
      createUserFixture({ email: 'user@example.com', avatarUrl: 'https://example.com/avatar.png' }),
    )

    // Act
    const result = await mock.getById(TEST_USER_ID)

    // Assert
    expect(result.email).toBe('user@example.com')
    expect(result.avatarUrl).toBe('https://example.com/avatar.png')
  })
})
