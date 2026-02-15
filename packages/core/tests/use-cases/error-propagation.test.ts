import type { UserId } from '../../src/model/value-objects.js'
import type { IAuditLogger } from '../../src/ports/audit-logger.js'
import type { IIssueRepository } from '../../src/ports/issue-repository.js'
import type { IProjectRepository } from '../../src/ports/project-repository.js'
import type { IUserRepository } from '../../src/ports/user-repository.js'
import { describe, expect, it, vi } from 'vitest'
import {
  AssignIssueUseCase,
  CreateIssueUseCase,
  GetProjectOverviewUseCase,
  UpdateIssueUseCase,
  UpdateStatusUseCase,
} from '../../src/use-cases/index.js'
import { TEST_ISSUE_ID, TEST_PROJECT_ID, TEST_USER_ID } from '../helpers/fixtures.js'

function createMockAuditLogger(): IAuditLogger {
  return {
    log: vi.fn().mockResolvedValue(undefined),
  }
}

describe('use case error propagation', () => {
  it('eP-01: CreateIssue re-throws non-ConflictError from repo', async () => {
    // Arrange
    const mockIssueRepo = {
      create: vi.fn().mockRejectedValue(new Error('DB down')),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as unknown as IIssueRepository
    const useCase = new CreateIssueUseCase(mockIssueRepo, createMockAuditLogger())

    // Act & Assert
    await expect(
      useCase.execute({ projectId: TEST_PROJECT_ID, title: 'Test' }, TEST_USER_ID),
    ).rejects.toThrow('DB down')
  })

  it('eP-02: UpdateStatus re-throws non-NotFoundError from repo.getById', async () => {
    // Arrange
    const mockIssueRepo = {
      create: vi.fn(),
      getById: vi.fn().mockRejectedValue(new Error('timeout')),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as unknown as IIssueRepository
    const useCase = new UpdateStatusUseCase(mockIssueRepo, createMockAuditLogger())

    // Act & Assert
    await expect(
      useCase.execute(TEST_ISSUE_ID, 'closed', TEST_USER_ID),
    ).rejects.toThrow('timeout')
  })

  it('eP-03: UpdateIssue re-throws non-NotFoundError from repo.update', async () => {
    // Arrange
    const mockIssueRepo = {
      create: vi.fn(),
      getById: vi.fn().mockResolvedValue({
        id: TEST_ISSUE_ID,
        projectId: TEST_PROJECT_ID,
        title: 'Existing',
        description: '',
        status: 'open',
        priority: 'normal',
        assigneeIds: [],
        tags: [],
        dueDate: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: vi.fn().mockRejectedValue(new TypeError('unexpected')),
      delete: vi.fn(),
      list: vi.fn(),
    } as unknown as IIssueRepository
    const useCase = new UpdateIssueUseCase(mockIssueRepo, createMockAuditLogger())

    // Act & Assert
    await expect(
      useCase.execute(TEST_ISSUE_ID, { title: 'Changed' }, TEST_USER_ID),
    ).rejects.toThrow(TypeError)
  })

  it('eP-04: AssignIssue re-throws non-NotFoundError from userRepo.getById', async () => {
    // Arrange
    const mockIssueRepo = {
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as unknown as IIssueRepository
    const mockUserRepo = {
      getById: vi.fn().mockRejectedValue(new Error('network')),
      getCurrent: vi.fn(),
      search: vi.fn(),
    } as unknown as IUserRepository
    const useCase = new AssignIssueUseCase(mockIssueRepo, mockUserRepo, createMockAuditLogger())
    const assigneeId = '550e8400-e29b-41d4-a716-446655440010' as UserId

    // Act & Assert
    await expect(
      useCase.execute(TEST_ISSUE_ID, assigneeId, TEST_USER_ID),
    ).rejects.toThrow('network')
  })

  it('eP-05: AssignIssue re-throws non-NotFoundError from issueRepo.getById', async () => {
    // Arrange
    const mockIssueRepo = {
      create: vi.fn(),
      getById: vi.fn().mockRejectedValue(new Error('disk')),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as unknown as IIssueRepository
    const assigneeId = '550e8400-e29b-41d4-a716-446655440010' as UserId
    const mockUserRepo = {
      getById: vi.fn().mockResolvedValue({
        id: assigneeId,
        name: 'Assignee',
        email: null,
        avatarUrl: null,
      }),
      getCurrent: vi.fn(),
      search: vi.fn(),
    } as unknown as IUserRepository
    const useCase = new AssignIssueUseCase(mockIssueRepo, mockUserRepo, createMockAuditLogger())

    // Act & Assert
    await expect(
      useCase.execute(TEST_ISSUE_ID, assigneeId, TEST_USER_ID),
    ).rejects.toThrow('disk')
  })

  it('eP-06: GetProjectOverview re-throws non-NotFoundError from projectRepo', async () => {
    // Arrange
    const mockProjectRepo = {
      create: vi.fn(),
      getById: vi.fn().mockRejectedValue(new Error('fail')),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as unknown as IProjectRepository
    const mockIssueRepo = {
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as unknown as IIssueRepository
    const useCase = new GetProjectOverviewUseCase(mockProjectRepo, mockIssueRepo)

    // Act & Assert
    await expect(
      useCase.execute(TEST_PROJECT_ID),
    ).rejects.toThrow('fail')
  })
})
