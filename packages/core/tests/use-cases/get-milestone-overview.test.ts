import type { IssueId, MilestoneId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryIssueRepository } from '../../src/adapters/in-memory-issue-repository.js'
import { InMemoryMilestoneRepository } from '../../src/adapters/in-memory-milestone-repository.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import { GetMilestoneOverviewUseCase } from '../../src/use-cases/index.js'
import {
  createIssueFixture,
  createMilestoneFixture,
  TEST_MILESTONE_ID,
} from '../helpers/fixtures.js'

describe('getMilestoneOverviewUseCase', () => {
  let milestoneRepository: InMemoryMilestoneRepository
  let issueRepository: InMemoryIssueRepository
  let useCase: GetMilestoneOverviewUseCase

  beforeEach(() => {
    milestoneRepository = new InMemoryMilestoneRepository()
    issueRepository = new InMemoryIssueRepository()
    useCase = new GetMilestoneOverviewUseCase(milestoneRepository, issueRepository)
  })

  it('pO-01: returns milestone with state breakdown', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])
    issueRepository.seed([
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, state: 'open' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, state: 'open' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as IssueId, state: 'done' }),
    ])

    // Act
    const result = await useCase.execute(TEST_MILESTONE_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.milestone.id).toBe(TEST_MILESTONE_ID)
      expect(result.value.totalIssues).toBe(3)
      expect(result.value.stateBreakdown.open).toBe(2)
      expect(result.value.stateBreakdown.done).toBe(1)
      expect(result.value.stateBreakdown.in_progress).toBe(0)
    }
  })

  it('pO-02: returns NotFoundError for unknown milestone', async () => {
    // Arrange
    const unknownId = '00000000-0000-0000-0000-000000000099' as MilestoneId

    // Act
    const result = await useCase.execute(unknownId)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('pO-03: returns zero counts for milestone with no issues', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])

    // Act
    const result = await useCase.execute(TEST_MILESTONE_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.totalIssues).toBe(0)
      expect(result.value.stateBreakdown.open).toBe(0)
      expect(result.value.stateBreakdown.in_progress).toBe(0)
      expect(result.value.stateBreakdown.done).toBe(0)
    }
  })

  it('pO-04: stateBreakdown includes all three states', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])
    issueRepository.seed([
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, state: 'open' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, state: 'in_progress' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as IssueId, state: 'done' }),
    ])

    // Act
    const result = await useCase.execute(TEST_MILESTONE_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.stateBreakdown.open).toBe(1)
      expect(result.value.stateBreakdown.in_progress).toBe(1)
      expect(result.value.stateBreakdown.done).toBe(1)
    }
  })

  it('pO-05: only counts issues belonging to milestone', async () => {
    // Arrange
    const otherMilestoneId = '550e8400-e29b-41d4-a716-000000000099' as MilestoneId
    milestoneRepository.seed([
      createMilestoneFixture(),
      createMilestoneFixture({ id: otherMilestoneId, name: 'Other Milestone' }),
    ])
    issueRepository.seed([
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, milestoneId: TEST_MILESTONE_ID, state: 'open' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, milestoneId: TEST_MILESTONE_ID, state: 'open' }),
      createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as IssueId, milestoneId: otherMilestoneId, state: 'open' }),
    ])

    // Act
    const result = await useCase.execute(TEST_MILESTONE_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.totalIssues).toBe(2)
    }
  })

  it('pO-06: fetches all issues across multiple pages (>100)', async () => {
    // Arrange
    milestoneRepository.seed([createMilestoneFixture()])
    const states = ['open', 'in_progress', 'done'] as const
    const issues = Array.from({ length: 150 }, (_, i) => {
      const padded = String(i).padStart(12, '0')
      return createIssueFixture({
        id: `550e8400-e29b-41d4-a716-${padded}` as IssueId,
        milestoneId: TEST_MILESTONE_ID,
        state: states[i % 3]!,
      })
    })
    issueRepository.seed(issues)

    // Act
    const result = await useCase.execute(TEST_MILESTONE_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.totalIssues).toBe(150)
      const sum = result.value.stateBreakdown.open
        + result.value.stateBreakdown.in_progress
        + result.value.stateBreakdown.done
      expect(sum).toBe(150)
    }
  })
})
