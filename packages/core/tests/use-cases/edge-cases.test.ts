import type { IssueId, ProjectId, UserId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryIssueRepository } from '../../src/adapters/in-memory-issue-repository.js'
import { InMemoryProjectRepository } from '../../src/adapters/in-memory-project-repository.js'
import { InMemoryUserRepository } from '../../src/adapters/in-memory-user-repository.js'
import { NotFoundError, ValidationError } from '../../src/errors/domain-errors.js'
import {
  AssignIssueUseCase,
  CreateIssueUseCase,
  GetProjectOverviewUseCase,
  UpdateIssueUseCase,
} from '../../src/use-cases/index.js'
import {
  createIssueFixture,
  createProjectFixture,
  TEST_ISSUE_ID,
  TEST_PROJECT_ID,
  TEST_USER_ID,
} from '../helpers/fixtures.js'

describe('edge Cases', () => {
  let issueRepository: InMemoryIssueRepository
  let projectRepository: InMemoryProjectRepository
  let userRepository: InMemoryUserRepository
  let auditLogger: InMemoryAuditLogger

  beforeEach(() => {
    issueRepository = new InMemoryIssueRepository()
    projectRepository = new InMemoryProjectRepository()
    userRepository = new InMemoryUserRepository()
    auditLogger = new InMemoryAuditLogger()
  })

  it('eC-01: CreateIssue with title at max length (500 chars)', async () => {
    // Arrange
    const useCase = new CreateIssueUseCase(issueRepository, auditLogger)
    const input = { projectId: TEST_PROJECT_ID, title: 'a'.repeat(500) }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
  })

  it('eC-02: CreateIssue with title exceeding max (501 chars)', async () => {
    // Arrange
    const useCase = new CreateIssueUseCase(issueRepository, auditLogger)
    const input = { projectId: TEST_PROJECT_ID, title: 'a'.repeat(501) }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('eC-03: UpdateIssue with empty object (no fields)', async () => {
    // Arrange
    const useCase = new UpdateIssueUseCase(issueRepository, auditLogger)
    issueRepository.seed([createIssueFixture()])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, {}, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.title).toBe('Test Issue')
    }
  })

  it('eC-04: AssignIssue validates user before issue', async () => {
    // Arrange
    const useCase = new AssignIssueUseCase(issueRepository, userRepository, auditLogger)
    const unknownIssueId = '00000000-0000-0000-0000-000000000099' as IssueId
    const unknownUserId = '00000000-0000-0000-0000-000000000098' as UserId

    // Act
    const result = await useCase.execute(unknownIssueId, unknownUserId, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
      expect(result.error.message).toContain('User')
    }
  })

  it('eC-05: GetProjectOverview filters by projectId', async () => {
    // Arrange
    const useCase = new GetProjectOverviewUseCase(projectRepository, issueRepository)
    const otherProjectId = '550e8400-e29b-41d4-a716-000000000099' as ProjectId
    projectRepository.seed([
      createProjectFixture(),
      createProjectFixture({ id: otherProjectId, name: 'Other' }),
    ])
    issueRepository.seed([
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, projectId: TEST_PROJECT_ID }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, projectId: TEST_PROJECT_ID }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as IssueId, projectId: otherProjectId }),
    ])

    // Act
    const result = await useCase.execute(TEST_PROJECT_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.totalIssues).toBe(2)
    }
  })

  it('eC-08: issue filter by search empty string matches all', async () => {
    // Arrange
    issueRepository.seed([
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, title: 'Alpha' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, title: 'Bravo' }),
    ])

    // Act
    const result = await issueRepository.list({ search: '' }, { page: 1, limit: 10 })

    // Assert
    expect(result.items).toHaveLength(2)
  })
})
