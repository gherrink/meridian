import type { IssueLink } from '../../src/model/issue-link.js'
import type { IssueId, IssueLinkId } from '../../src/model/value-objects.js'

import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryIssueLinkRepository } from '../../src/adapters/in-memory-issue-link-repository.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'

const TEST_ISSUE_LINK_ID = '550e8400-e29b-41d4-a716-446655440010' as IssueLinkId
const TEST_ISSUE_LINK_ID_2 = '550e8400-e29b-41d4-a716-446655440011' as IssueLinkId
const TEST_ISSUE_LINK_ID_3 = '550e8400-e29b-41d4-a716-446655440012' as IssueLinkId
const TEST_ISSUE_ID_A = '550e8400-e29b-41d4-a716-446655440001' as IssueId
const TEST_ISSUE_ID_B = '550e8400-e29b-41d4-a716-446655440002' as IssueId
const TEST_ISSUE_ID_C = '550e8400-e29b-41d4-a716-446655440003' as IssueId
const TEST_ISSUE_ID_D = '550e8400-e29b-41d4-a716-446655440004' as IssueId
const UNKNOWN_ID = '00000000-0000-0000-0000-000000000099' as IssueLinkId

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

describe('inMemoryIssueLinkRepository', () => {
  let repository: InMemoryIssueLinkRepository

  beforeEach(() => {
    repository = new InMemoryIssueLinkRepository()
  })

  describe('create', () => {
    it('rE-01: create stores and returns link', async () => {
      // Arrange
      const link = createIssueLinkFixture()

      // Act
      const returned = await repository.create(link)

      // Assert
      expect(returned).toEqual(link)
    })
  })

  describe('findById', () => {
    it('rE-02: findById returns stored link', async () => {
      // Arrange
      const link = createIssueLinkFixture()
      await repository.create(link)

      // Act
      const found = await repository.findById(TEST_ISSUE_LINK_ID)

      // Assert
      expect(found).toEqual(link)
    })

    it('rE-03: findById returns null for unknown id', async () => {
      // Act
      const found = await repository.findById(UNKNOWN_ID)

      // Assert
      expect(found).toBeNull()
    })
  })

  describe('delete', () => {
    it('rE-04: delete removes link', async () => {
      // Arrange
      const link = createIssueLinkFixture()
      await repository.create(link)

      // Act
      await repository.delete(TEST_ISSUE_LINK_ID)

      // Assert
      const found = await repository.findById(TEST_ISSUE_LINK_ID)
      expect(found).toBeNull()
    })

    it('rE-05: delete throws NotFoundError for unknown id', async () => {
      // Act & Assert
      await expect(repository.delete(UNKNOWN_ID)).rejects.toThrow(NotFoundError)
    })
  })

  describe('findByIssueId', () => {
    it('rE-06: findByIssueId returns links where issue is source', async () => {
      // Arrange
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_B,
      }))
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID_2,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_C,
      }))

      // Act
      const links = await repository.findByIssueId(TEST_ISSUE_ID_A)

      // Assert
      expect(links).toHaveLength(2)
    })

    it('rE-07: findByIssueId returns links where issue is target', async () => {
      // Arrange
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_B,
      }))

      // Act
      const links = await repository.findByIssueId(TEST_ISSUE_ID_B)

      // Assert
      expect(links).toHaveLength(1)
    })

    it('rE-08: findByIssueId with type filter', async () => {
      // Arrange
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_B,
        type: 'blocks',
      }))
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID_2,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_C,
        type: 'relates-to',
      }))

      // Act
      const links = await repository.findByIssueId(TEST_ISSUE_ID_A, { type: 'blocks' })

      // Assert
      expect(links).toHaveLength(1)
    })

    it('rE-09: findByIssueId returns empty for unlinked issue', async () => {
      // Arrange
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_B,
      }))

      // Act
      const links = await repository.findByIssueId(TEST_ISSUE_ID_C)

      // Assert
      expect(links).toEqual([])
    })

    it('eC-03: findByIssueId with undefined filter returns all links for issue', async () => {
      // Arrange
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_B,
        type: 'blocks',
      }))
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID_2,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_C,
        type: 'relates-to',
      }))

      // Act
      const links = await repository.findByIssueId(TEST_ISSUE_ID_A, undefined)

      // Assert
      expect(links).toHaveLength(2)
    })
  })

  describe('findBySourceAndTargetAndType', () => {
    it('rE-10: findBySourceAndTargetAndType finds exact match', async () => {
      // Arrange
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_B,
        type: 'blocks',
      }))

      // Act
      const found = await repository.findBySourceAndTargetAndType(
        TEST_ISSUE_ID_A,
        TEST_ISSUE_ID_B,
        'blocks',
      )

      // Assert
      expect(found).toBeDefined()
      expect(found!.type).toBe('blocks')
    })

    it('rE-11: findBySourceAndTargetAndType returns null for no match', async () => {
      // Arrange
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_B,
        type: 'blocks',
      }))

      // Act
      const found = await repository.findBySourceAndTargetAndType(
        TEST_ISSUE_ID_A,
        TEST_ISSUE_ID_B,
        'duplicates',
      )

      // Assert
      expect(found).toBeNull()
    })
  })

  describe('deleteByIssueId', () => {
    it('rE-12: deleteByIssueId removes all links for issue', async () => {
      // Arrange
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_B,
      }))
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID_2,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_C,
      }))
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID_3,
        sourceIssueId: TEST_ISSUE_ID_D,
        targetIssueId: TEST_ISSUE_ID_A,
      }))

      // Act
      await repository.deleteByIssueId(TEST_ISSUE_ID_A)

      // Assert
      expect(await repository.findById(TEST_ISSUE_LINK_ID)).toBeNull()
      expect(await repository.findById(TEST_ISSUE_LINK_ID_2)).toBeNull()
      expect(await repository.findById(TEST_ISSUE_LINK_ID_3)).toBeNull()
    })

    it('rE-13: deleteByIssueId does not remove unrelated links', async () => {
      // Arrange
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID,
        sourceIssueId: TEST_ISSUE_ID_A,
        targetIssueId: TEST_ISSUE_ID_B,
      }))
      await repository.create(createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID_2,
        sourceIssueId: TEST_ISSUE_ID_C,
        targetIssueId: TEST_ISSUE_ID_D,
      }))

      // Act
      await repository.deleteByIssueId(TEST_ISSUE_ID_A)

      // Assert
      const remaining = await repository.findById(TEST_ISSUE_LINK_ID_2)
      expect(remaining).toBeDefined()
      expect(remaining).not.toBeNull()
    })

    it('eC-04: deleteByIssueId on issue with no links causes no error', async () => {
      // Arrange
      const unlinkedId = '550e8400-e29b-41d4-a716-446655440099' as IssueId

      // Act & Assert (should not throw)
      await expect(repository.deleteByIssueId(unlinkedId)).resolves.toBeUndefined()
    })
  })

  describe('seed', () => {
    it('rE-14: seed populates store', () => {
      // Arrange
      const link1 = createIssueLinkFixture({ id: TEST_ISSUE_LINK_ID })
      const link2 = createIssueLinkFixture({
        id: TEST_ISSUE_LINK_ID_2,
        sourceIssueId: TEST_ISSUE_ID_C,
        targetIssueId: TEST_ISSUE_ID_D,
      })

      // Act
      repository.seed([link1, link2])

      // Assert — use async/await pattern for findById
      expect(repository.findById(TEST_ISSUE_LINK_ID)).resolves.toEqual(link1)
      expect(repository.findById(TEST_ISSUE_LINK_ID_2)).resolves.toEqual(link2)
    })
  })

  describe('reset', () => {
    it('rE-15: reset clears store', async () => {
      // Arrange
      const link = createIssueLinkFixture()
      await repository.create(link)

      // Act
      repository.reset()

      // Assert
      const found = await repository.findById(TEST_ISSUE_LINK_ID)
      expect(found).toBeNull()
    })
  })
})
