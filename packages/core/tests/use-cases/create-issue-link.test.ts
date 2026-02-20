import type { IssueId } from '../../src/model/value-objects.js'

import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryIssueLinkRepository } from '../../src/adapters/in-memory-issue-link-repository.js'
import { InMemoryIssueRepository } from '../../src/adapters/in-memory-issue-repository.js'
import { ConflictError, NotFoundError, ValidationError } from '../../src/errors/domain-errors.js'
import { DEFAULT_RELATIONSHIP_TYPES } from '../../src/model/relationship-type.js'
import { CreateIssueLinkUseCase } from '../../src/use-cases/index.js'
import { createIssueFixture, TEST_ISSUE_ID, TEST_MILESTONE_ID } from '../helpers/fixtures.js'

const TEST_ISSUE_ID_2 = '550e8400-e29b-41d4-a716-446655440002' as IssueId
const UNKNOWN_ISSUE_ID = '00000000-0000-0000-0000-000000000099' as IssueId

describe('createIssueLinkUseCase', () => {
  let issueRepository: InMemoryIssueRepository
  let issueLinkRepository: InMemoryIssueLinkRepository
  let useCase: CreateIssueLinkUseCase

  beforeEach(() => {
    issueRepository = new InMemoryIssueRepository()
    issueLinkRepository = new InMemoryIssueLinkRepository()

    // Seed two issues; ensure TEST_ISSUE_ID < TEST_ISSUE_ID_2 lexicographically
    issueRepository.seed([
      createIssueFixture({ id: TEST_ISSUE_ID, milestoneId: TEST_MILESTONE_ID }),
      createIssueFixture({ id: TEST_ISSUE_ID_2, milestoneId: TEST_MILESTONE_ID, title: 'Issue 2' }),
    ])

    useCase = new CreateIssueLinkUseCase(issueLinkRepository, issueRepository, DEFAULT_RELATIONSHIP_TYPES)
  })

  it('cL-01: creates link with valid input', async () => {
    // Arrange
    const input = {
      sourceIssueId: TEST_ISSUE_ID,
      targetIssueId: TEST_ISSUE_ID_2,
      type: 'blocks',
    }

    // Act
    const result = await useCase.execute(input)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBeDefined()
      expect(result.value.type).toBe('blocks')
      expect(result.value.createdAt).toBeInstanceOf(Date)
    }
  })

  it('cL-02: returns ValidationError for unknown type', async () => {
    // Arrange
    const input = {
      sourceIssueId: TEST_ISSUE_ID,
      targetIssueId: TEST_ISSUE_ID_2,
      type: 'unknown',
    }

    // Act
    const result = await useCase.execute(input)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
      expect(result.error.message).toContain('unknown')
    }
  })

  it('cL-03: rejects self-link', async () => {
    // Arrange
    const input = {
      sourceIssueId: TEST_ISSUE_ID,
      targetIssueId: TEST_ISSUE_ID,
      type: 'blocks',
    }

    // Act
    const result = await useCase.execute(input)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
      expect(result.error.message.toLowerCase()).toContain('itself')
    }
  })

  it('cL-04: rejects duplicate link', async () => {
    // Arrange
    const input = {
      sourceIssueId: TEST_ISSUE_ID,
      targetIssueId: TEST_ISSUE_ID_2,
      type: 'blocks',
    }
    await useCase.execute(input)

    // Act
    const result = await useCase.execute(input)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ConflictError)
    }
  })

  it('cL-05: normalizes symmetric link order', async () => {
    // Arrange - use source UUID > target UUID for symmetric type
    // TEST_ISSUE_ID_2 (..0002) > TEST_ISSUE_ID (..0001) is false
    // So we need to swap: source = ID_2 (larger), target = ID (smaller)
    const input = {
      sourceIssueId: TEST_ISSUE_ID_2,
      targetIssueId: TEST_ISSUE_ID,
      type: 'relates-to',
    }

    // Act
    const result = await useCase.execute(input)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      // After normalization, sourceIssueId should be the smaller UUID
      expect(result.value.sourceIssueId < result.value.targetIssueId).toBe(true)
    }
  })

  it('cL-06: detects duplicate after symmetric normalization', async () => {
    // Arrange - create relates-to A->B first
    await useCase.execute({
      sourceIssueId: TEST_ISSUE_ID,
      targetIssueId: TEST_ISSUE_ID_2,
      type: 'relates-to',
    })

    // Act - try B->A (should normalize to same A->B)
    const result = await useCase.execute({
      sourceIssueId: TEST_ISSUE_ID_2,
      targetIssueId: TEST_ISSUE_ID,
      type: 'relates-to',
    })

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ConflictError)
    }
  })

  it('cL-07: does not normalize directed link order', async () => {
    // Arrange - use source UUID > target UUID for directed type
    const input = {
      sourceIssueId: TEST_ISSUE_ID_2,
      targetIssueId: TEST_ISSUE_ID,
      type: 'blocks',
    }

    // Act
    const result = await useCase.execute(input)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.sourceIssueId).toBe(TEST_ISSUE_ID_2)
      expect(result.value.targetIssueId).toBe(TEST_ISSUE_ID)
    }
  })

  it('cL-08: returns NotFoundError for nonexistent source issue', async () => {
    // Arrange
    const input = {
      sourceIssueId: UNKNOWN_ISSUE_ID,
      targetIssueId: TEST_ISSUE_ID_2,
      type: 'blocks',
    }

    // Act
    const result = await useCase.execute(input)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('cL-09: returns NotFoundError for nonexistent target issue', async () => {
    // Arrange
    const input = {
      sourceIssueId: TEST_ISSUE_ID,
      targetIssueId: UNKNOWN_ISSUE_ID,
      type: 'blocks',
    }

    // Act
    const result = await useCase.execute(input)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError)
    }
  })

  it('cL-10: returns ValidationError for invalid input (null)', async () => {
    // Act
    const result = await useCase.execute(null as any)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cL-11: returns ValidationError for non-UUID sourceIssueId', async () => {
    // Arrange
    const input = {
      sourceIssueId: 'bad',
      targetIssueId: TEST_ISSUE_ID_2,
      type: 'blocks',
    }

    // Act
    const result = await useCase.execute(input as any)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cL-12: returns ValidationError for empty type string', async () => {
    // Arrange
    const input = {
      sourceIssueId: TEST_ISSUE_ID,
      targetIssueId: TEST_ISSUE_ID_2,
      type: '',
    }

    // Act
    const result = await useCase.execute(input)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cL-13: allows same pair with different types', async () => {
    // Arrange
    await useCase.execute({
      sourceIssueId: TEST_ISSUE_ID,
      targetIssueId: TEST_ISSUE_ID_2,
      type: 'blocks',
    })

    // Act
    const result = await useCase.execute({
      sourceIssueId: TEST_ISSUE_ID,
      targetIssueId: TEST_ISSUE_ID_2,
      type: 'duplicates',
    })

    // Assert
    expect(result.ok).toBe(true)
  })
})
