import type { IssueId } from '../../src/model/value-objects.js'
import type { IIssueRepository } from '../../src/ports/issue-repository.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryIssueRepository } from '../../src/adapters/in-memory-issue-repository.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import { GetIssueUseCase } from '../../src/use-cases/index.js'
import { createIssueFixture, TEST_ISSUE_ID } from '../helpers/fixtures.js'

describe('getIssueUseCase', () => {
  let issueRepository: InMemoryIssueRepository
  let useCase: GetIssueUseCase

  beforeEach(() => {
    issueRepository = new InMemoryIssueRepository()
    useCase = new GetIssueUseCase(issueRepository)
  })

  it('gI-pattern: returns issue when found', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBe(TEST_ISSUE_ID)
      expect(result.value.title).toBe('Test Issue')
    }
  })

  it('gI-pattern: returns NotFoundError for unknown issue', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as IssueId

    // Act
    const result = await useCase.execute(unknownId)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('gI-pattern: rethrows non-domain error from getById', async () => {
    // Arrange
    const mockRepo = {
      create: vi.fn(),
      getById: vi.fn().mockRejectedValue(new Error('network')),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as unknown as IIssueRepository
    const mockUseCase = new GetIssueUseCase(mockRepo)

    // Act & Assert
    await expect(mockUseCase.execute(TEST_ISSUE_ID)).rejects.toThrow('network')
  })
})
