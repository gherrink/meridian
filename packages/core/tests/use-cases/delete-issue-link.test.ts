import type { IssueLink } from '../../src/model/issue-link.js'

import type { IssueId, IssueLinkId } from '../../src/model/value-objects.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryIssueLinkRepository } from '../../src/adapters/in-memory-issue-link-repository.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import { DeleteIssueLinkUseCase } from '../../src/use-cases/index.js'

const TEST_ISSUE_LINK_ID = '550e8400-e29b-41d4-a716-446655440010' as IssueLinkId
const UNKNOWN_LINK_ID = '00000000-0000-0000-0000-000000000099' as IssueLinkId
const TEST_ISSUE_ID_A = '550e8400-e29b-41d4-a716-446655440001' as IssueId
const TEST_ISSUE_ID_B = '550e8400-e29b-41d4-a716-446655440002' as IssueId

const TEST_DATE = new Date('2025-01-01')

function createIssueLinkFixture(overrides: Partial<IssueLink> = {}): IssueLink {
  return {
    id: TEST_ISSUE_LINK_ID,
    sourceIssueId: TEST_ISSUE_ID_A,
    targetIssueId: TEST_ISSUE_ID_B,
    type: 'blocks',
    createdAt: TEST_DATE,
    ...overrides,
  }
}

describe('deleteIssueLinkUseCase', () => {
  let issueLinkRepository: InMemoryIssueLinkRepository
  let useCase: DeleteIssueLinkUseCase

  beforeEach(() => {
    issueLinkRepository = new InMemoryIssueLinkRepository()
    useCase = new DeleteIssueLinkUseCase(issueLinkRepository)
  })

  it('dL-01: deletes existing link', async () => {
    // Arrange
    issueLinkRepository.seed([createIssueLinkFixture()])

    // Act
    const result = await useCase.execute(TEST_ISSUE_LINK_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toBeUndefined()
    }
  })

  it('dL-02: link no longer found after delete', async () => {
    // Arrange
    issueLinkRepository.seed([createIssueLinkFixture()])

    // Act
    await useCase.execute(TEST_ISSUE_LINK_ID)

    // Assert
    const found = await issueLinkRepository.findById(TEST_ISSUE_LINK_ID)
    expect(found).toBeNull()
  })

  it('dL-03: returns NotFoundError for unknown id', async () => {
    // Act
    const result = await useCase.execute(UNKNOWN_LINK_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })
})
