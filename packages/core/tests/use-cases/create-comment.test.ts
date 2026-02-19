import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryCommentRepository } from '../../src/adapters/in-memory-comment-repository.js'
import { ValidationError } from '../../src/errors/domain-errors.js'
import { CreateCommentUseCase } from '../../src/use-cases/index.js'
import { TEST_ISSUE_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('createCommentUseCase', () => {
  let commentRepository: InMemoryCommentRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: CreateCommentUseCase

  beforeEach(() => {
    commentRepository = new InMemoryCommentRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new CreateCommentUseCase(commentRepository, auditLogger)
  })

  it('cC-01: creates comment with valid input', async () => {
    // Arrange
    const input = { body: 'Hello', authorId: TEST_USER_ID, issueId: TEST_ISSUE_ID }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBeDefined()
      expect(result.value.body).toBe('Hello')
      expect(result.value.authorId).toBe(TEST_USER_ID)
      expect(result.value.issueId).toBe(TEST_ISSUE_ID)
      expect(result.value.createdAt).toBeInstanceOf(Date)
      expect(result.value.updatedAt).toBeInstanceOf(Date)
    }
  })

  it('cC-02: returns ValidationError for missing body', async () => {
    // Arrange
    const input = { authorId: TEST_USER_ID, issueId: TEST_ISSUE_ID }

    // Act
    const result = await useCase.execute(input as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cC-03: returns ValidationError for empty body', async () => {
    // Arrange
    const input = { body: '', authorId: TEST_USER_ID, issueId: TEST_ISSUE_ID }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cC-04: returns ValidationError for missing authorId', async () => {
    // Arrange
    const input = { body: 'x', issueId: TEST_ISSUE_ID }

    // Act
    const result = await useCase.execute(input as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cC-05: returns ValidationError for invalid authorId (not uuid)', async () => {
    // Arrange
    const input = { body: 'x', authorId: 'bad', issueId: TEST_ISSUE_ID }

    // Act
    const result = await useCase.execute(input as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cC-06: returns ValidationError for missing issueId', async () => {
    // Arrange
    const input = { body: 'x', authorId: TEST_USER_ID }

    // Act
    const result = await useCase.execute(input as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cC-07: audit metadata has commentId and issueId', async () => {
    // Arrange
    const input = { body: 'Hello', authorId: TEST_USER_ID, issueId: TEST_ISSUE_ID }

    // Act
    await useCase.execute(input, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.operation).toBe('CreateComment')
    expect(entries[0]!.userId).toBe(TEST_USER_ID)
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata.commentId).toBeDefined()
    expect(metadata.issueId).toBe(TEST_ISSUE_ID)
  })

  it('cC-pattern: does not log audit on validation failure', async () => {
    // Arrange
    const input = { body: '', authorId: TEST_USER_ID, issueId: TEST_ISSUE_ID }

    // Act
    await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('cC-pattern: returns ValidationError for null input', async () => {
    // Act
    const result = await useCase.execute(null as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cC-pattern: returns ValidationError for number input', async () => {
    // Act
    const result = await useCase.execute(42 as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('eC-01: returns ValidationError for string input', async () => {
    // Act
    const result = await useCase.execute('hello' as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cC-pattern: rethrows non-domain errors', async () => {
    // Arrange
    const input = { body: 'Hello', authorId: TEST_USER_ID, issueId: TEST_ISSUE_ID }
    commentRepository.create = async () => {
      throw new Error('DB down')
    }

    // Act & Assert
    await expect(useCase.execute(input, TEST_USER_ID)).rejects.toThrow('DB down')
  })
})
