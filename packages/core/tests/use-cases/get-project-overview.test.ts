import { beforeEach, describe, expect, it } from 'vitest'
import type { IssueId, ProjectId } from '../../src/model/value-objects.js'
import { GetProjectOverviewUseCase } from '../../src/use-cases/index.js'
import { InMemoryIssueRepository } from '../../src/adapters/in-memory-issue-repository.js'
import { InMemoryProjectRepository } from '../../src/adapters/in-memory-project-repository.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import {
  createIssueFixture,
  createProjectFixture,
  TEST_PROJECT_ID,
} from '../helpers/fixtures.js'

describe('GetProjectOverviewUseCase', () => {
  let projectRepository: InMemoryProjectRepository
  let issueRepository: InMemoryIssueRepository
  let useCase: GetProjectOverviewUseCase

  beforeEach(() => {
    projectRepository = new InMemoryProjectRepository()
    issueRepository = new InMemoryIssueRepository()
    useCase = new GetProjectOverviewUseCase(projectRepository, issueRepository)
  })

  it('PO-01: returns project with status breakdown', async () => {
    // Arrange
    projectRepository.seed([createProjectFixture()])
    issueRepository.seed([
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, status: 'open' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, status: 'open' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as IssueId, status: 'closed' }),
    ])

    // Act
    const result = await useCase.execute(TEST_PROJECT_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.project.id).toBe(TEST_PROJECT_ID)
      expect(result.value.totalIssues).toBe(3)
      expect(result.value.statusBreakdown.open).toBe(2)
      expect(result.value.statusBreakdown.closed).toBe(1)
      expect(result.value.statusBreakdown.in_progress).toBe(0)
    }
  })

  it('PO-02: returns NotFoundError for unknown project', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as ProjectId

    // Act
    const result = await useCase.execute(unknownId)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('PO-03: returns zero counts for project with no issues', async () => {
    // Arrange
    projectRepository.seed([createProjectFixture()])

    // Act
    const result = await useCase.execute(TEST_PROJECT_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.totalIssues).toBe(0)
      expect(result.value.statusBreakdown.open).toBe(0)
      expect(result.value.statusBreakdown.in_progress).toBe(0)
      expect(result.value.statusBreakdown.closed).toBe(0)
    }
  })

  it('PO-04: statusBreakdown includes all three statuses', async () => {
    // Arrange
    projectRepository.seed([createProjectFixture()])
    issueRepository.seed([
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, status: 'open' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, status: 'in_progress' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as IssueId, status: 'closed' }),
    ])

    // Act
    const result = await useCase.execute(TEST_PROJECT_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.statusBreakdown.open).toBe(1)
      expect(result.value.statusBreakdown.in_progress).toBe(1)
      expect(result.value.statusBreakdown.closed).toBe(1)
    }
  })

  it('PO-05: only counts issues belonging to project', async () => {
    // Arrange
    const otherProjectId = '550e8400-e29b-41d4-a716-000000000099' as ProjectId
    projectRepository.seed([
      createProjectFixture(),
      createProjectFixture({ id: otherProjectId, name: 'Other Project' }),
    ])
    issueRepository.seed([
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, projectId: TEST_PROJECT_ID, status: 'open' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, projectId: TEST_PROJECT_ID, status: 'open' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as IssueId, projectId: otherProjectId, status: 'open' }),
    ])

    // Act
    const result = await useCase.execute(TEST_PROJECT_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.totalIssues).toBe(2)
    }
  })
})
