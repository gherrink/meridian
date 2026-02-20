import type { IssueLink } from '../../src/model/issue-link.js'
import type { IssueId, IssueLinkId } from '../../src/model/value-objects.js'

import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryIssueLinkRepository } from '../../src/adapters/in-memory-issue-link-repository.js'
import { DEFAULT_RELATIONSHIP_TYPES } from '../../src/model/relationship-type.js'
import { ListIssueLinksUseCase } from '../../src/use-cases/index.js'

const TEST_ISSUE_LINK_ID = '550e8400-e29b-41d4-a716-446655440010' as IssueLinkId
const TEST_ISSUE_LINK_ID_2 = '550e8400-e29b-41d4-a716-446655440011' as IssueLinkId
const TEST_ISSUE_ID_A = '550e8400-e29b-41d4-a716-446655440001' as IssueId
const TEST_ISSUE_ID_B = '550e8400-e29b-41d4-a716-446655440002' as IssueId
const TEST_ISSUE_ID_C = '550e8400-e29b-41d4-a716-446655440003' as IssueId

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

describe('listIssueLinksUseCase', () => {
  let issueLinkRepository: InMemoryIssueLinkRepository
  let useCase: ListIssueLinksUseCase

  beforeEach(() => {
    issueLinkRepository = new InMemoryIssueLinkRepository()
    useCase = new ListIssueLinksUseCase(issueLinkRepository, DEFAULT_RELATIONSHIP_TYPES)
  })

  it('lL-01: returns empty array for issue with no links', async () => {
    // Act
    const result = await useCase.execute(TEST_ISSUE_ID_A)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual([])
    }
  })

  it('lL-02: returns outgoing link with forward label', async () => {
    // Arrange
    issueLinkRepository.seed([createIssueLinkFixture({
      id: TEST_ISSUE_LINK_ID,
      sourceIssueId: TEST_ISSUE_ID_A,
      targetIssueId: TEST_ISSUE_ID_B,
      type: 'blocks',
    })])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID_A)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(1)
      expect(result.value[0]!.direction).toBe('outgoing')
      expect(result.value[0]!.label).toBe('blocks')
      expect(result.value[0]!.linkedIssueId).toBe(TEST_ISSUE_ID_B)
    }
  })

  it('lL-03: returns incoming link with inverse label', async () => {
    // Arrange
    issueLinkRepository.seed([createIssueLinkFixture({
      id: TEST_ISSUE_LINK_ID,
      sourceIssueId: TEST_ISSUE_ID_A,
      targetIssueId: TEST_ISSUE_ID_B,
      type: 'blocks',
    })])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID_B)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(1)
      expect(result.value[0]!.direction).toBe('incoming')
      expect(result.value[0]!.label).toBe('is blocked by')
      expect(result.value[0]!.linkedIssueId).toBe(TEST_ISSUE_ID_A)
    }
  })

  it('lL-04: symmetric link shows same label in both directions', async () => {
    // Arrange
    issueLinkRepository.seed([createIssueLinkFixture({
      id: TEST_ISSUE_LINK_ID,
      sourceIssueId: TEST_ISSUE_ID_A,
      targetIssueId: TEST_ISSUE_ID_B,
      type: 'relates-to',
    })])

    // Act
    const resultA = await useCase.execute(TEST_ISSUE_ID_A)
    const resultB = await useCase.execute(TEST_ISSUE_ID_B)

    // Assert
    expect(resultA.ok).toBe(true)
    expect(resultB.ok).toBe(true)
    if (resultA.ok) {
      expect(resultA.value[0]!.label).toBe('relates to')
    }
    if (resultB.ok) {
      expect(resultB.value[0]!.label).toBe('relates to')
    }
  })

  it('lL-05: returns multiple links bidirectionally', async () => {
    // Arrange - A->B blocks, C->A duplicates
    issueLinkRepository.seed([
      createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_B,
        type: 'blocks',
      }),
      createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID_2,
        sourceIssueId: TEST_ISSUE_ID_C,
        targetIssueId: TEST_ISSUE_ID_A,
        type: 'duplicates',
      }),
    ])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID_A)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(2)
    }
  })

  it('lL-06: filters by type', async () => {
    // Arrange
    issueLinkRepository.seed([
      createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_B,
        type: 'blocks',
      }),
      createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID_2,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_C,
        type: 'relates-to',
      }),
    ])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID_A, { type: 'blocks' })

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(1)
    }
  })

  it('lL-07: falls back to type name when type not in configured set', async () => {
    // Arrange - use empty relationship types, seed link with custom type
    const useCaseWithEmpty = new ListIssueLinksUseCase(issueLinkRepository, [])
    issueLinkRepository.seed([createIssueLinkFixture({
      id: TEST_ISSUE_LINK_ID,
      sourceIssueId: TEST_ISSUE_ID_A,
      targetIssueId: TEST_ISSUE_ID_B,
      type: 'custom',
    })])

    // Act
    const result = await useCaseWithEmpty.execute(TEST_ISSUE_ID_A)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(1)
      expect(result.value[0]!.label).toBe('custom')
    }
  })

  it('lL-08: each resolved link has correct id and createdAt', async () => {
    // Arrange
    issueLinkRepository.seed([createIssueLinkFixture({
      id: TEST_ISSUE_LINK_ID,
      sourceIssueId: TEST_ISSUE_ID_A,
      targetIssueId: TEST_ISSUE_ID_B,
      type: 'blocks',
      createdAt: TEST_DATE,
    })])

    // Act
    const result = await useCase.execute(TEST_ISSUE_ID_A)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value[0]!.id).toBe(TEST_ISSUE_LINK_ID)
      expect(result.value[0]!.createdAt).toEqual(TEST_DATE)
    }
  })
})
