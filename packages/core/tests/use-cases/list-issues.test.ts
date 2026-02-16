import type { IssueId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryIssueRepository } from '../../src/adapters/in-memory-issue-repository.js'
import { ListIssuesUseCase } from '../../src/use-cases/index.js'
import { createIssueFixture } from '../helpers/fixtures.js'

describe('listIssuesUseCase', () => {
  let issueRepository: InMemoryIssueRepository
  let useCase: ListIssuesUseCase

  beforeEach(() => {
    issueRepository = new InMemoryIssueRepository()
    useCase = new ListIssuesUseCase(issueRepository)
  })

  it('lI-01: returns paginated result', async () => {
    // Arrange
    issueRepository.seed([
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as IssueId }),
    ])

    // Act
    const result = await useCase.execute({}, { page: 1, limit: 2 })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items).toHaveLength(2)
      expect(result.value.total).toBe(3)
      expect(result.value.hasMore).toBe(true)
    }
  })

  it('lI-02: filters by status', async () => {
    // Arrange
    issueRepository.seed([
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, status: 'open' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, status: 'open' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as IssueId, status: 'closed' }),
    ])

    // Act
    const result = await useCase.execute({ status: 'open' }, { page: 1, limit: 10 })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items).toHaveLength(2)
    }
  })

  it('lI-03: returns empty result with no matches', async () => {
    // Arrange
    issueRepository.seed([
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, status: 'open' }),
    ])

    // Act
    const result = await useCase.execute({ status: 'closed' }, { page: 1, limit: 10 })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items).toHaveLength(0)
      expect(result.value.total).toBe(0)
    }
  })

  it('lI-04: accepts sort options', async () => {
    // Arrange
    issueRepository.seed([
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, title: 'Bravo' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, title: 'Alpha' }),
    ])

    // Act
    const result = await useCase.execute({}, { page: 1, limit: 10 }, { field: 'title', direction: 'asc' })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items[0]!.title).toBe('Alpha')
    }
  })

  it('lI-05: always returns success (no error path)', async () => {
    // Act
    const result = await useCase.execute({}, { page: 1, limit: 10 })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.items).toEqual([])
      expect(result.value.total).toBe(0)
    }
  })
})
