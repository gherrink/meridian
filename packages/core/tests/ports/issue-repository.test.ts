import type { CreateIssueInput, UpdateIssueInput } from '../../src/model/issue.js'

import type { PaginationParams } from '../../src/model/pagination.js'
import type { IssueFilterParams } from '../../src/ports/issue-filter-params.js'
import type { IIssueRepository } from '../../src/ports/issue-repository.js'
import type { SortOptions } from '../../src/ports/sort-options.js'
import { describe, expect, it, vi } from 'vitest'
import {
  createIssueFixture,
  TEST_ISSUE_ID,
  TEST_PROJECT_ID,
} from '../helpers/fixtures.js'

describe('iIssueRepository', () => {
  function createMock(): IIssueRepository {
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

  it('create accepts CreateIssueInput and returns Promise of Issue', async () => {
    // Arrange
    const mock = createMock()
    mock.create = vi.fn().mockResolvedValue(createIssueFixture())
    const input: CreateIssueInput = { projectId: TEST_PROJECT_ID, title: 'New Issue' }

    // Act
    const result = await mock.create(input)

    // Assert
    expect(result.id).toBe(TEST_ISSUE_ID)
    expect(result.title).toBe('Test Issue')
    expect(mock.create).toHaveBeenCalledOnce()
    expect(mock.create).toHaveBeenCalledWith(input)
  })

  it('getById accepts IssueId and returns Promise of Issue', async () => {
    // Arrange
    const mock = createMock()
    mock.getById = vi.fn().mockResolvedValue(createIssueFixture())

    // Act
    const result = await mock.getById(TEST_ISSUE_ID)

    // Assert
    expect(result.id).toBe(TEST_ISSUE_ID)
    expect(mock.getById).toHaveBeenCalledOnce()
    expect(mock.getById).toHaveBeenCalledWith(TEST_ISSUE_ID)
  })

  it('update accepts IssueId and UpdateIssueInput, returns Promise of Issue', async () => {
    // Arrange
    const mock = createMock()
    const updateInput: UpdateIssueInput = { title: 'Updated Title' }
    mock.update = vi.fn().mockResolvedValue(createIssueFixture({ title: 'Updated Title' }))

    // Act
    const result = await mock.update(TEST_ISSUE_ID, updateInput)

    // Assert
    expect(result.title).toBe('Updated Title')
    expect(mock.update).toHaveBeenCalledOnce()
    expect(mock.update).toHaveBeenCalledWith(TEST_ISSUE_ID, updateInput)
  })

  it('delete accepts IssueId and returns Promise of void', async () => {
    // Arrange
    const mock = createMock()
    mock.delete = vi.fn().mockResolvedValue(undefined)

    // Act
    const result = await mock.delete(TEST_ISSUE_ID)

    // Assert
    expect(result).toBeUndefined()
    expect(mock.delete).toHaveBeenCalledOnce()
    expect(mock.delete).toHaveBeenCalledWith(TEST_ISSUE_ID)
  })

  it('list accepts IssueFilterParams, PaginationParams, and optional SortOptions', async () => {
    // Arrange
    const mock = createMock()
    const filter: IssueFilterParams = { status: 'open' }
    const pagination: PaginationParams = { page: 1, limit: 20 }
    const sort: SortOptions = { field: 'createdAt', direction: 'desc' }
    mock.list = vi.fn().mockResolvedValue({
      items: [createIssueFixture()],
      total: 1,
      page: 1,
      limit: 20,
      hasMore: false,
    })

    // Act
    const result = await mock.list(filter, pagination, sort)

    // Assert
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.hasMore).toBe(false)
    expect(mock.list).toHaveBeenCalledOnce()
    expect(mock.list).toHaveBeenCalledWith(filter, pagination, sort)
  })

  it('list works without sort parameter (sort is optional)', async () => {
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
    const result = await mock.list({}, { page: 1, limit: 20 })

    // Assert
    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
    expect(mock.list).toHaveBeenCalledOnce()
    expect(mock.list.mock.calls[0]).toHaveLength(2)
  })

  it('list returns empty result set for no matches', async () => {
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
    const result = await mock.list({ search: 'nonexistent' }, { page: 1, limit: 20 })

    // Assert
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
    expect(result.hasMore).toBe(false)
  })

  it('list with empty filter returns all issues', async () => {
    // Arrange
    const mock = createMock()
    mock.list = vi.fn().mockResolvedValue({
      items: [createIssueFixture()],
      total: 1,
      page: 1,
      limit: 20,
      hasMore: false,
    })

    // Act
    await mock.list({}, { page: 1, limit: 20 })

    // Assert
    expect(mock.list).toHaveBeenCalledOnce()
    expect(mock.list).toHaveBeenCalledWith({}, { page: 1, limit: 20 })
  })

  it('list with paginated result indicating more pages', async () => {
    // Arrange
    const mock = createMock()
    mock.list = vi.fn().mockResolvedValue({
      items: [createIssueFixture()],
      total: 50,
      page: 1,
      limit: 20,
      hasMore: true,
    })

    // Act
    const result = await mock.list({}, { page: 1, limit: 20 })

    // Assert
    expect(result.hasMore).toBe(true)
    expect(result.total).toBe(50)
    expect(result.items).toHaveLength(1)
  })
})
