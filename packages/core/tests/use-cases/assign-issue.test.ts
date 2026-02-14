import { beforeEach, describe, expect, it } from 'vitest'
import type { IssueId, UserId } from '../../src/model/value-objects.js'
import { AssignIssueUseCase } from '../../src/use-cases/index.js'
import { InMemoryIssueRepository } from '../../src/adapters/in-memory-issue-repository.js'
import { InMemoryUserRepository } from '../../src/adapters/in-memory-user-repository.js'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import {
  createIssueFixture,
  createUserFixture,
  TEST_ISSUE_ID,
  TEST_USER_ID,
} from '../helpers/fixtures.js'

describe('AssignIssueUseCase', () => {
  let issueRepository: InMemoryIssueRepository
  let userRepository: InMemoryUserRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: AssignIssueUseCase

  const ASSIGNEE_ID = '550e8400-e29b-41d4-a716-446655440010' as UserId
  const ACTOR_USER_ID = TEST_USER_ID

  beforeEach(() => {
    issueRepository = new InMemoryIssueRepository()
    userRepository = new InMemoryUserRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new AssignIssueUseCase(issueRepository, userRepository, auditLogger)
  })

  it('AI-01: assigns user to issue', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])
    userRepository.seed([createUserFixture({ id: ASSIGNEE_ID, name: 'Assignee' })])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, ASSIGNEE_ID, ACTOR_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.assigneeIds).toContain(ASSIGNEE_ID)
    }
  })

  it('AI-02: returns NotFoundError when user not found', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])
    // No user seeded

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, ASSIGNEE_ID, ACTOR_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
      expect(result.error.message).toContain('User')
    }
  })

  it('AI-03: returns NotFoundError when issue not found', async () => {
    // Arrange
    userRepository.seed([createUserFixture({ id: ASSIGNEE_ID, name: 'Assignee' })])
    const unknownIssueId = '00000000-0000-0000-0000-000000000099' as IssueId

    // Act
    const result = await useCase.execute(unknownIssueId, ASSIGNEE_ID, ACTOR_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
      expect(result.error.message).toContain('Issue')
    }
  })

  it('AI-04: does not duplicate assignee already assigned', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture({ assigneeIds: [ASSIGNEE_ID] })])
    userRepository.seed([createUserFixture({ id: ASSIGNEE_ID, name: 'Assignee' })])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, ASSIGNEE_ID, ACTOR_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.assigneeIds).toHaveLength(1)
    }
  })

  it('AI-05: appends to existing assignees', async () => {
    // Arrange
    const existingAssignee = '550e8400-e29b-41d4-a716-446655440020' as UserId
    issueRepository.seed([createIssueFixture({ assigneeIds: [existingAssignee] })])
    userRepository.seed([createUserFixture({ id: ASSIGNEE_ID, name: 'New Assignee' })])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID, ASSIGNEE_ID, ACTOR_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.assigneeIds).toHaveLength(2)
      expect(result.value.assigneeIds).toContain(existingAssignee)
      expect(result.value.assigneeIds).toContain(ASSIGNEE_ID)
    }
  })

  it('AI-06: logs audit on success', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])
    userRepository.seed([createUserFixture({ id: ASSIGNEE_ID, name: 'Assignee' })])

    // Act
    await useCase.execute(TEST_ISSUE_ID, ASSIGNEE_ID, ACTOR_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.operation).toBe('AssignIssue')
    const metadata = entries[0]!.metadata as Record<string, unknown>
    expect(metadata).toHaveProperty('issueId')
    expect(metadata).toHaveProperty('assigneeId')
  })

  it('AI-07: does not log when user not found', async () => {
    // Arrange
    issueRepository.seed([createIssueFixture()])
    // No user seeded

    // Act
    await useCase.execute(TEST_ISSUE_ID, ASSIGNEE_ID, ACTOR_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('AI-08: does not log when issue not found', async () => {
    // Arrange
    userRepository.seed([createUserFixture({ id: ASSIGNEE_ID, name: 'Assignee' })])
    const unknownIssueId = '00000000-0000-0000-0000-000000000099' as IssueId

    // Act
    await useCase.execute(unknownIssueId, ASSIGNEE_ID, ACTOR_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })
})
