import type { CommentId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryCommentRepository } from '../../src/adapters/in-memory-comment-repository.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import { DeleteCommentUseCase } from '../../src/use-cases/index.js'
import { createCommentFixture, TEST_COMMENT_ID, TEST_ISSUE_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('deleteCommentUseCase', () => {
  let commentRepository: InMemoryCommentRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: DeleteCommentUseCase

  beforeEach(() => {
    commentRepository = new InMemoryCommentRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new DeleteCommentUseCase(commentRepository, auditLogger)
  })

  it('dC-pattern: deletes existing comment', async () => {
    // Arrange
    commentRepository.seed([createCommentFixture()])

    // Act
    const result = await useCase.execute(TEST_COMMENT_ID, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBeUndefined()
    }
  })

  it('dC-pattern: subsequent get fails after delete', async () => {
    // Arrange
    commentRepository.seed([createCommentFixture()])

    // Act
    await useCase.execute(TEST_COMMENT_ID, TEST_USER_ID)

    // Assert
    const listResult = await commentRepository.getByIssueId(TEST_ISSUE_ID, { page: 1, limit: 10 })
    expect(listResult.total).toBe(0)
  })

  it('dC-pattern: returns NotFoundError for unknown comment', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as CommentId

    // Act
    const result = await useCase.execute(unknownId, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('dC-pattern: logs audit on valid delete', async () => {
    // Arrange
    commentRepository.seed([createCommentFixture()])

    // Act
    await useCase.execute(TEST_COMMENT_ID, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.operation).toBe('DeleteComment')
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.commentId).toBeDefined()
  })

  it('dC-pattern: no audit on not found', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as CommentId

    // Act
    await useCase.execute(unknownId, TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('dC-pattern: rethrows non-domain errors', async () => {
    // Arrange
    commentRepository.seed([createCommentFixture()])
    commentRepository.delete = async () => {
      throw new Error('DB down')
    }

    // Act & Assert
    await expect(useCase.execute(TEST_COMMENT_ID, TEST_USER_ID)).rejects.toThrow('DB down')
  })
})
