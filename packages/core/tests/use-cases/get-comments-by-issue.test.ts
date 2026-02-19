import type { CommentId, IssueId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryCommentRepository } from '../../src/adapters/in-memory-comment-repository.js'
import { GetCommentsByIssueUseCase } from '../../src/use-cases/index.js'
import { createCommentFixture, TEST_ISSUE_ID } from '../helpers/fixtures.js'

describe('getCommentsByIssueUseCase', () => {
  let commentRepository: InMemoryCommentRepository
  let useCase: GetCommentsByIssueUseCase

  beforeEach(() => {
    commentRepository = new InMemoryCommentRepository()
    useCase = new GetCommentsByIssueUseCase(commentRepository)
  })

  it('gC-01: returns comments for issue', async () => {
    // Arrange
    commentRepository.seed([
      createCommentFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as CommentId }),
      createCommentFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as CommentId }),
    ])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, { page: 1, limit: 10 })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items).toHaveLength(2)
    }
  })

  it('gC-02: excludes comments from other issues', async () => {
    // Arrange
    const otherIssueId = '550e8400-e29b-41d4-a716-000000000099' as IssueId
    commentRepository.seed([
      createCommentFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as CommentId, issueId: TEST_ISSUE_ID }),
      createCommentFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as CommentId, issueId: otherIssueId }),
    ])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, { page: 1, limit: 10 })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items).toHaveLength(1)
    }
  })

  it('gC-03: returns empty when no comments', async () => {
    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, { page: 1, limit: 10 })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items).toEqual([])
      expect(result.value.total).toBe(0)
    }
  })

  it('gC-04: pagination works', async () => {
    // Arrange
    commentRepository.seed([
      createCommentFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as CommentId }),
      createCommentFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as CommentId }),
      createCommentFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as CommentId }),
    ])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, { page: 1, limit: 2 })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items).toHaveLength(2)
      expect(result.value.hasMore).toBe(true)
    }
  })

  it('gC-05: always returns success', async () => {
    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, { page: 1, limit: 10 })

    // Assert
    expect(result.ok).toBe(true)
  })
})
