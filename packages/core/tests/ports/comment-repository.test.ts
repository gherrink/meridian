import type { CreateCommentInput, UpdateCommentInput } from '../../src/model/comment.js'

import type { PaginationParams } from '../../src/model/pagination.js'
import type { ICommentRepository } from '../../src/ports/comment-repository.js'
import type { SortOptions } from '../../src/ports/sort-options.js'
import { describe, expect, it, vi } from 'vitest'
import {
  createCommentFixture,
  TEST_COMMENT_ID,
  TEST_ISSUE_ID,
  TEST_USER_ID,
} from '../helpers/fixtures.js'

describe('iCommentRepository', () => {
  function createMock(): ICommentRepository {
    return {
      create: vi.fn(),
      getByIssueId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

  it('defines a getByIssueId method', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(typeof mock.getByIssueId).toBe('function')
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

  it('has exactly 4 methods', () => {
    // Arrange
    const mock = createMock()

    // Assert
    expect(Object.keys(mock)).toHaveLength(4)
  })

  it('create accepts CreateCommentInput and returns Promise of Comment', async () => {
    // Arrange
    const mock = createMock()
    mock.create = vi.fn().mockResolvedValue(createCommentFixture())
    const input: CreateCommentInput = { body: 'A comment', authorId: TEST_USER_ID, issueId: TEST_ISSUE_ID }

    // Act
    const result = await mock.create(input)

    // Assert
    expect(result.id).toBe(TEST_COMMENT_ID)
    expect(result.body).toBe('Test comment body')
    expect(mock.create).toHaveBeenCalledOnce()
    expect(mock.create).toHaveBeenCalledWith(input)
  })

  it('getByIssueId accepts IssueId and PaginationParams, returns PaginatedResult of Comment', async () => {
    // Arrange
    const mock = createMock()
    const pagination: PaginationParams = { page: 1, limit: 20 }
    mock.getByIssueId = vi.fn().mockResolvedValue({
      items: [createCommentFixture()],
      total: 1,
      page: 1,
      limit: 20,
      hasMore: false,
    })

    // Act
    const result = await mock.getByIssueId(TEST_ISSUE_ID, pagination)

    // Assert
    expect(result.items).toHaveLength(1)
    expect(result.items[0]!.issueId).toBe(TEST_ISSUE_ID)
    expect(mock.getByIssueId).toHaveBeenCalledOnce()
    expect(mock.getByIssueId).toHaveBeenCalledWith(TEST_ISSUE_ID, pagination)
  })

  it('getByIssueId accepts optional SortOptions parameter', async () => {
    // Arrange
    const mock = createMock()
    const sort: SortOptions = { field: 'createdAt', direction: 'asc' }
    mock.getByIssueId = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
    })

    // Act
    const result = await mock.getByIssueId(TEST_ISSUE_ID, { page: 1, limit: 20 }, sort)

    // Assert
    expect(result.items).toHaveLength(0)
    expect(mock.getByIssueId).toHaveBeenCalledOnce()
    expect(mock.getByIssueId.mock.calls[0]).toHaveLength(3)
  })

  it('getByIssueId returns empty result for issue with no comments', async () => {
    // Arrange
    const mock = createMock()
    mock.getByIssueId = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
    })

    // Act
    const result = await mock.getByIssueId(TEST_ISSUE_ID, { page: 1, limit: 20 })

    // Assert
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
    expect(result.hasMore).toBe(false)
  })

  it('update accepts CommentId and UpdateCommentInput, returns Promise of Comment', async () => {
    // Arrange
    const mock = createMock()
    const input: UpdateCommentInput = { body: 'Updated body' }
    mock.update = vi.fn().mockResolvedValue(createCommentFixture({ body: 'Updated body' }))

    // Act
    const result = await mock.update(TEST_COMMENT_ID, input)

    // Assert
    expect(result.body).toBe('Updated body')
    expect(mock.update).toHaveBeenCalledOnce()
    expect(mock.update).toHaveBeenCalledWith(TEST_COMMENT_ID, input)
  })

  it('delete accepts CommentId and returns Promise of void', async () => {
    // Arrange
    const mock = createMock()
    mock.delete = vi.fn().mockResolvedValue(undefined)

    // Act
    const result = await mock.delete(TEST_COMMENT_ID)

    // Assert
    expect(result).toBeUndefined()
    expect(mock.delete).toHaveBeenCalledOnce()
    expect(mock.delete).toHaveBeenCalledWith(TEST_COMMENT_ID)
  })

  it('getByIssueId with different pagination values', async () => {
    // Arrange
    const mock = createMock()
    mock.getByIssueId = vi.fn().mockResolvedValue({
      items: [createCommentFixture()],
      total: 15,
      page: 3,
      limit: 5,
      hasMore: true,
    })

    // Act
    const result = await mock.getByIssueId(TEST_ISSUE_ID, { page: 3, limit: 5 })

    // Assert
    expect(mock.getByIssueId).toHaveBeenCalledOnce()
    expect(mock.getByIssueId).toHaveBeenCalledWith(TEST_ISSUE_ID, { page: 3, limit: 5 })
    expect(result.page).toBe(3)
    expect(result.limit).toBe(5)
    expect(result.hasMore).toBe(true)
  })
})
