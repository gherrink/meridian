import type { CommentId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryCommentRepository } from '../../src/adapters/in-memory-comment-repository.js'
import { NotFoundError, ValidationError } from '../../src/errors/domain-errors.js'
import { UpdateCommentUseCase } from '../../src/use-cases/index.js'
import { createCommentFixture, TEST_COMMENT_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('updateCommentUseCase', () => {
  let commentRepository: InMemoryCommentRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: UpdateCommentUseCase

  beforeEach(() => {
    commentRepository = new InMemoryCommentRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new UpdateCommentUseCase(commentRepository, auditLogger)
  })

  it('uC-01: updates body', async () => {
    // Arrange
    commentRepository.seed([createCommentFixture()])

    // Act
    const result = await useCase.execute(TEST_COMMENT_ID, { body: 'Updated' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.body).toBe('Updated')
    }
  })

  it('uC-02: empty body rejected', async () => {
    // Arrange
    commentRepository.seed([createCommentFixture()])

    // Act
    const result = await useCase.execute(TEST_COMMENT_ID, { body: '' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('uC-pattern: preserves unmodified fields', async () => {
    // Arrange
    commentRepository.seed([createCommentFixture({ body: 'Original body' })])

    // Act
    const result = await useCase.execute(TEST_COMMENT_ID, { body: 'New body' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.authorId).toBe(TEST_USER_ID)
    }
  })

  it('uC-pattern: returns NotFoundError for unknown comment', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as CommentId

    // Act
    const result = await useCase.execute(unknownId, { body: 'Nope' }, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('uC-pattern: logs audit on valid update', async () => {
    // Arrange
    commentRepository.seed([createCommentFixture()])

    // Act
    await useCase.execute(TEST_COMMENT_ID, { body: 'Changed' }, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.operation).toBe('UpdateComment')
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.updatedFields).toBeDefined()
  })

  it('uC-pattern: audit has updatedFields with field names', async () => {
    // Arrange
    commentRepository.seed([createCommentFixture()])

    // Act
    await useCase.execute(TEST_COMMENT_ID, { body: 'Changed' }, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    const metadata = entries[0]!.metadata as Record<string, unknown>
    const updatedFields = metadata.updatedFields as string[]
    expect(updatedFields).toContain('body')
  })

  it('uC-pattern: empty update has empty updatedFields', async () => {
    // Arrange
    commentRepository.seed([createCommentFixture()])

    // Act
    await useCase.execute(TEST_COMMENT_ID, {}, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.updatedFields).toEqual([])
  })

  it('uC-pattern: no audit on not found', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as CommentId

    // Act
    await useCase.execute(unknownId, { body: 'Nope' }, TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('eC-03: rethrows non-domain error from update', async () => {
    // Arrange
    commentRepository.seed([createCommentFixture()])
    commentRepository.update = async () => {
      throw new TypeError()
    }

    // Act & Assert
    await expect(
      useCase.execute(TEST_COMMENT_ID, { body: 'Changed' }, TEST_USER_ID),
    ).rejects.toThrow(TypeError)
  })
})
