import type { Comment, CreateCommentInput } from '../../src/model/comment.js'
import type { CommentId, IssueId } from '../../src/model/value-objects.js'

import { describe, expect, it } from 'vitest'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import { InMemoryCommentRepository } from '../../src/adapters/in-memory-comment-repository.js'
import {
  createCommentFixture,
  TEST_COMMENT_ID,
  TEST_ISSUE_ID,
  TEST_USER_ID,
} from '../helpers/fixtures.js'

describe('InMemoryCommentRepository', () => {
  describe('create', () => {
    it('creates a comment with generated ID and timestamps', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      const input: CreateCommentInput = {
        body: 'A new comment',
        authorId: TEST_USER_ID,
        issueId: TEST_ISSUE_ID,
      }

      // Act
      const created = await repository.create(input)

      // Assert
      expect(created.id).toBeDefined()
      expect(created.body).toBe('A new comment')
      expect(created.authorId).toBe(TEST_USER_ID)
      expect(created.issueId).toBe(TEST_ISSUE_ID)
      expect(created.createdAt).toBeInstanceOf(Date)
      expect(created.updatedAt).toBeInstanceOf(Date)
    })

    it('generates unique IDs for each comment', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      const input: CreateCommentInput = {
        body: 'Comment',
        authorId: TEST_USER_ID,
        issueId: TEST_ISSUE_ID,
      }

      // Act
      const first = await repository.create(input)
      const second = await repository.create(input)

      // Assert
      expect(first.id).not.toBe(second.id)
    })
  })

  describe('getByIssueId', () => {
    it('returns comments for the specified issue', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      const otherIssueId = '550e8400-e29b-41d4-a716-000000000099' as IssueId
      const matchingComment = createCommentFixture({
        id: '550e8400-e29b-41d4-a716-000000000001' as CommentId,
        issueId: TEST_ISSUE_ID,
      })
      const otherComment = createCommentFixture({
        id: '550e8400-e29b-41d4-a716-000000000002' as CommentId,
        issueId: otherIssueId,
      })
      repository.seed([matchingComment, otherComment])

      // Act
      const result = await repository.getByIssueId(TEST_ISSUE_ID, { page: 1, limit: 10 })

      // Assert
      expect(result.items).toHaveLength(1)
      expect(result.items[0]!.issueId).toBe(TEST_ISSUE_ID)
      expect(result.total).toBe(1)
    })

    it('returns empty result when issue has no comments', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      const emptyIssueId = '550e8400-e29b-41d4-a716-000000000099' as IssueId

      // Act
      const result = await repository.getByIssueId(emptyIssueId, { page: 1, limit: 10 })

      // Assert
      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })

    it('paginates comments for an issue', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      const comments: Comment[] = [
        createCommentFixture({
          id: '550e8400-e29b-41d4-a716-000000000001' as CommentId,
          body: 'First',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        }),
        createCommentFixture({
          id: '550e8400-e29b-41d4-a716-000000000002' as CommentId,
          body: 'Second',
          createdAt: new Date('2025-02-01'),
          updatedAt: new Date('2025-02-01'),
        }),
        createCommentFixture({
          id: '550e8400-e29b-41d4-a716-000000000003' as CommentId,
          body: 'Third',
          createdAt: new Date('2025-03-01'),
          updatedAt: new Date('2025-03-01'),
        }),
      ]
      repository.seed(comments)

      // Act
      const result = await repository.getByIssueId(TEST_ISSUE_ID, { page: 1, limit: 2 })

      // Assert
      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(3)
      expect(result.hasMore).toBe(true)
    })

    it('sorts comments by createdAt descending by default', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      const older = createCommentFixture({
        id: '550e8400-e29b-41d4-a716-000000000001' as CommentId,
        body: 'Older',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      })
      const newer = createCommentFixture({
        id: '550e8400-e29b-41d4-a716-000000000002' as CommentId,
        body: 'Newer',
        createdAt: new Date('2025-06-01'),
        updatedAt: new Date('2025-06-01'),
      })
      repository.seed([older, newer])

      // Act
      const result = await repository.getByIssueId(TEST_ISSUE_ID, { page: 1, limit: 10 })

      // Assert
      expect(result.items[0]!.body).toBe('Newer')
      expect(result.items[1]!.body).toBe('Older')
    })

    it('sorts comments by specified sort options', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      const older = createCommentFixture({
        id: '550e8400-e29b-41d4-a716-000000000001' as CommentId,
        body: 'Older',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      })
      const newer = createCommentFixture({
        id: '550e8400-e29b-41d4-a716-000000000002' as CommentId,
        body: 'Newer',
        createdAt: new Date('2025-06-01'),
        updatedAt: new Date('2025-06-01'),
      })
      repository.seed([older, newer])

      // Act
      const result = await repository.getByIssueId(
        TEST_ISSUE_ID,
        { page: 1, limit: 10 },
        { field: 'createdAt', direction: 'asc' },
      )

      // Assert
      expect(result.items[0]!.body).toBe('Older')
      expect(result.items[1]!.body).toBe('Newer')
    })
  })

  describe('update', () => {
    it('updates the comment body', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      repository.seed([createCommentFixture()])

      // Act
      const updated = await repository.update(TEST_COMMENT_ID, { body: 'Updated body' })

      // Assert
      expect(updated.body).toBe('Updated body')
    })

    it('updates the updatedAt timestamp without changing createdAt', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      const original = createCommentFixture()
      repository.seed([original])

      // Act
      const updated = await repository.update(TEST_COMMENT_ID, { body: 'Changed' })

      // Assert
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime())
      expect(updated.createdAt).toEqual(original.createdAt)
    })

    it('throws NotFoundError when comment does not exist', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      const fakeId = '00000000-0000-0000-0000-000000000000' as CommentId

      // Act & Assert
      await expect(repository.update(fakeId, { body: 'Nope' })).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('removes the comment from the store', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      repository.seed([createCommentFixture()])

      // Act
      await repository.delete(TEST_COMMENT_ID)

      // Assert
      const result = await repository.getByIssueId(TEST_ISSUE_ID, { page: 1, limit: 10 })
      expect(result.total).toBe(0)
    })

    it('throws NotFoundError when comment does not exist', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      const fakeId = '00000000-0000-0000-0000-000000000000' as CommentId

      // Act & Assert
      await expect(repository.delete(fakeId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('seed', () => {
    it('populates the store with provided comments', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      repository.seed([createCommentFixture()])

      // Act
      const result = await repository.getByIssueId(TEST_ISSUE_ID, { page: 1, limit: 10 })

      // Assert
      expect(result.total).toBe(1)
    })
  })

  describe('reset', () => {
    it('clears all data from the store', async () => {
      // Arrange
      const repository = new InMemoryCommentRepository()
      repository.seed([createCommentFixture()])

      // Act
      repository.reset()
      const result = await repository.getByIssueId(TEST_ISSUE_ID, { page: 1, limit: 10 })

      // Assert
      expect(result.total).toBe(0)
    })
  })
})
