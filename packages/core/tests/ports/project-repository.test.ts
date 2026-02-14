import type { PaginationParams } from '../../src/model/pagination.js'

import type { CreateProjectInput, UpdateProjectInput } from '../../src/model/project.js'
import type { IProjectRepository } from '../../src/ports/project-repository.js'
import type { SortOptions } from '../../src/ports/sort-options.js'
import { describe, expect, it, vi } from 'vitest'
import {
  createProjectFixture,
  TEST_PROJECT_ID,
} from '../helpers/fixtures.js'

describe('iProjectRepository', () => {
  function createMock(): IProjectRepository {
    return {
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    }
  }

  it('can be satisfied by a mock with all required methods', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(mock).toBeDefined()
  })

  it('defines a create method', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(typeof mock.create).toBe('function')
  })

  it('defines a getById method', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(typeof mock.getById).toBe('function')
  })

  it('defines an update method', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(typeof mock.update).toBe('function')
  })

  it('defines a delete method', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(typeof mock.delete).toBe('function')
  })

  it('defines a list method', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(typeof mock.list).toBe('function')
  })

  it('has exactly 5 methods', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(Object.keys(mock)).toHaveLength(5)
  })

  it('create accepts CreateProjectInput and returns Promise of Project', async () => {
    // Arrange
    const mock = createMock()
    mock.create = vi.fn().mockResolvedValue(createProjectFixture())
    const input: CreateProjectInput = { name: 'My Project' }

    // Act
    const result = await mock.create(input)

    // Assert
    expect(result.id).toBe(TEST_PROJECT_ID)
    expect(result.name).toBe('Test Project')
    expect(mock.create).toHaveBeenCalledOnce()
    expect(mock.create).toHaveBeenCalledWith(input)
  })

  it('getById accepts ProjectId and returns Promise of Project', async () => {
    // Arrange
    const mock = createMock()
    mock.getById = vi.fn().mockResolvedValue(createProjectFixture())

    // Act
    const result = await mock.getById(TEST_PROJECT_ID)

    // Assert
    expect(result.id).toBe(TEST_PROJECT_ID)
    expect(mock.getById).toHaveBeenCalledOnce()
    expect(mock.getById).toHaveBeenCalledWith(TEST_PROJECT_ID)
  })

  it('update accepts ProjectId and UpdateProjectInput, returns Promise of Project', async () => {
    // Arrange
    const mock = createMock()
    const input: UpdateProjectInput = { name: 'Updated Project' }
    mock.update = vi.fn().mockResolvedValue(createProjectFixture({ name: 'Updated Project' }))

    // Act
    const result = await mock.update(TEST_PROJECT_ID, input)

    // Assert
    expect(result.name).toBe('Updated Project')
    expect(mock.update).toHaveBeenCalledOnce()
    expect(mock.update).toHaveBeenCalledWith(TEST_PROJECT_ID, input)
  })

  it('delete accepts ProjectId and returns Promise of void', async () => {
    // Arrange
    const mock = createMock()
    mock.delete = vi.fn().mockResolvedValue(undefined)

    // Act
    const result = await mock.delete(TEST_PROJECT_ID)

    // Assert
    expect(result).toBeUndefined()
    expect(mock.delete).toHaveBeenCalledOnce()
    expect(mock.delete).toHaveBeenCalledWith(TEST_PROJECT_ID)
  })

  it('list accepts PaginationParams and optional SortOptions, returns PaginatedResult of Project', async () => {
    // Arrange
    const mock = createMock()
    const pagination: PaginationParams = { page: 1, limit: 10 }
    const sort: SortOptions = { field: 'name', direction: 'asc' }
    mock.list = vi.fn().mockResolvedValue({
      items: [createProjectFixture()],
      total: 1,
      page: 1,
      limit: 10,
      hasMore: false,
    })

    // Act
    const result = await mock.list(pagination, sort)

    // Assert
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(mock.list).toHaveBeenCalledOnce()
    expect(mock.list).toHaveBeenCalledWith(pagination, sort)
  })

  it('list works without sort parameter', async () => {
    // Arrange
    const mock = createMock()
    mock.list = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
    })

    // Act
    const result = await mock.list({ page: 1, limit: 20 })

    // Assert
    expect(result.items).toHaveLength(0)
    expect(mock.list).toHaveBeenCalledOnce()
    expect(mock.list.mock.calls[0]).toHaveLength(1)
  })
})
