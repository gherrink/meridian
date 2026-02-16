import type { CreateIssueInput, Issue } from '../../src/model/issue.js'
import type { IssueId, ProjectId, UserId } from '../../src/model/value-objects.js'

import { describe, expect, it } from 'vitest'
import { InMemoryIssueRepository } from '../../src/adapters/in-memory-issue-repository.js'
import { NotFoundError } from '../../src/errors/domain-errors.js'
import {
  createIssueFixture,
  createTagFixture,
  TEST_ISSUE_ID,
  TEST_PROJECT_ID,
  TEST_USER_ID,
} from '../helpers/fixtures.js'

describe('inMemoryIssueRepository', () => {
  describe('create', () => {
    it('creates an issue with generated ID and timestamps', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      const input: CreateIssueInput = {
        projectId: TEST_PROJECT_ID,
        title: 'New Issue',
      }

      // Act
      const created = await repository.create(input)

      // Assert
      expect(created.id).toBeDefined()
      expect(created.title).toBe('New Issue')
      expect(created.projectId).toBe(TEST_PROJECT_ID)
      expect(created.createdAt).toBeInstanceOf(Date)
      expect(created.updatedAt).toBeInstanceOf(Date)
    })

    it('applies defaults for optional fields', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()

      // Act
      const created = await repository.create({
        projectId: TEST_PROJECT_ID,
        title: 'Minimal Issue',
      })

      // Assert
      expect(created.description).toBe('')
      expect(created.status).toBe('open')
      expect(created.priority).toBe('normal')
      expect(created.assigneeIds).toEqual([])
      expect(created.tags).toEqual([])
      expect(created.dueDate).toBeNull()
      expect(created.metadata).toEqual({})
    })

    it('preserves provided optional fields', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      const testTag = createTagFixture()
      const input: CreateIssueInput = {
        projectId: TEST_PROJECT_ID,
        title: 'Full Issue',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        assigneeIds: [TEST_USER_ID],
        tags: [testTag],
        metadata: { source: 'test' },
      }

      // Act
      const created = await repository.create(input)

      // Assert
      expect(created.description).toBe('Detailed description')
      expect(created.status).toBe('in_progress')
      expect(created.priority).toBe('high')
      expect(created.assigneeIds).toEqual([TEST_USER_ID])
      expect(created.tags).toEqual([testTag])
      expect(created.metadata).toEqual({ source: 'test' })
    })

    it('generates unique IDs for each issue', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      const input: CreateIssueInput = {
        projectId: TEST_PROJECT_ID,
        title: 'Issue',
      }

      // Act
      const first = await repository.create(input)
      const second = await repository.create(input)

      // Assert
      expect(first.id).not.toBe(second.id)
    })
  })

  describe('getById', () => {
    it('returns the issue when it exists', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      const created = await repository.create({
        projectId: TEST_PROJECT_ID,
        title: 'Findable',
      })

      // Act
      const found = await repository.getById(created.id)

      // Assert
      expect(found).toEqual(created)
    })

    it('throws NotFoundError when issue does not exist', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      const fakeId = '00000000-0000-0000-0000-000000000000' as IssueId

      // Act & Assert
      await expect(repository.getById(fakeId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('update', () => {
    it('updates specified fields and preserves others', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      const created = await repository.create({
        projectId: TEST_PROJECT_ID,
        title: 'Original',
        description: 'Keep this',
      })

      // Act
      const updated = await repository.update(created.id, { title: 'Updated' })

      // Assert
      expect(updated.title).toBe('Updated')
      expect(updated.description).toBe('Keep this')
    })

    it('updates the updatedAt timestamp without changing createdAt', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      const created = await repository.create({
        projectId: TEST_PROJECT_ID,
        title: 'Timestamped',
      })

      // Act
      const updated = await repository.update(created.id, { title: 'Changed' })

      // Assert
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime())
      expect(updated.createdAt).toEqual(created.createdAt)
    })

    it('allows setting nullable fields to null', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      const created = await repository.create({
        projectId: TEST_PROJECT_ID,
        title: 'With due date',
        dueDate: new Date('2025-12-31'),
      })

      // Act
      const updated = await repository.update(created.id, { dueDate: null })

      // Assert
      expect(updated.dueDate).toBeNull()
    })

    it('does not overwrite fields with undefined', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      const created = await repository.create({
        projectId: TEST_PROJECT_ID,
        title: 'Keep Title',
        status: 'in_progress',
      })

      // Act
      const updated = await repository.update(created.id, { priority: 'high' })

      // Assert
      expect(updated.title).toBe('Keep Title')
      expect(updated.status).toBe('in_progress')
      expect(updated.priority).toBe('high')
    })

    it('throws NotFoundError when issue does not exist', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      const fakeId = '00000000-0000-0000-0000-000000000000' as IssueId

      // Act & Assert
      await expect(repository.update(fakeId, { title: 'Nope' })).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('removes the issue from the store', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      const created = await repository.create({
        projectId: TEST_PROJECT_ID,
        title: 'Doomed',
      })

      // Act
      await repository.delete(created.id)

      // Assert
      await expect(repository.getById(created.id)).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when issue does not exist', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      const fakeId = '00000000-0000-0000-0000-000000000000' as IssueId

      // Act & Assert
      await expect(repository.delete(fakeId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('list', () => {
    describe('filtering', () => {
      it('returns all issues with empty filter', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        repository.seed([
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId }),
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId }),
        ])

        // Act
        const result = await repository.list({}, { page: 1, limit: 10 })

        // Assert
        expect(result.items).toHaveLength(2)
        expect(result.total).toBe(2)
      })

      it('filters by status', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        repository.seed([
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, status: 'open' }),
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, status: 'closed' }),
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as IssueId, status: 'open' }),
        ])

        // Act
        const result = await repository.list({ status: 'open' }, { page: 1, limit: 10 })

        // Assert
        expect(result.items).toHaveLength(2)
        expect(result.total).toBe(2)
      })

      it('filters by priority', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        repository.seed([
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, priority: 'high' }),
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, priority: 'low' }),
        ])

        // Act
        const result = await repository.list({ priority: 'high' }, { page: 1, limit: 10 })

        // Assert
        expect(result.items).toHaveLength(1)
        expect(result.items[0]!.priority).toBe('high')
      })

      it('filters by projectId', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        const otherProjectId = '550e8400-e29b-41d4-a716-000000000099' as ProjectId
        repository.seed([
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, projectId: TEST_PROJECT_ID }),
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, projectId: otherProjectId }),
        ])

        // Act
        const result = await repository.list({ projectId: TEST_PROJECT_ID }, { page: 1, limit: 10 })

        // Assert
        expect(result.items).toHaveLength(1)
        expect(result.items[0]!.projectId).toBe(TEST_PROJECT_ID)
      })

      it('filters by assigneeId (checks array membership)', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        const otherUserId = '550e8400-e29b-41d4-a716-000000000099' as UserId
        repository.seed([
          createIssueFixture({
            id: '550e8400-e29b-41d4-a716-000000000001' as IssueId,
            assigneeIds: [TEST_USER_ID],
          }),
          createIssueFixture({
            id: '550e8400-e29b-41d4-a716-000000000002' as IssueId,
            assigneeIds: [otherUserId],
          }),
          createIssueFixture({
            id: '550e8400-e29b-41d4-a716-000000000003' as IssueId,
            assigneeIds: [],
          }),
        ])

        // Act
        const result = await repository.list({ assigneeId: TEST_USER_ID }, { page: 1, limit: 10 })

        // Assert
        expect(result.items).toHaveLength(1)
        expect(result.items[0]!.assigneeIds).toContain(TEST_USER_ID)
      })

      it('filters by search text in title (case-insensitive)', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        repository.seed([
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, title: 'Login Bug Fix' }),
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, title: 'Dashboard Feature' }),
        ])

        // Act
        const result = await repository.list({ search: 'login' }, { page: 1, limit: 10 })

        // Assert
        expect(result.items).toHaveLength(1)
        expect(result.items[0]!.title).toBe('Login Bug Fix')
      })

      it('filters by search text in description', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        repository.seed([
          createIssueFixture({
            id: '550e8400-e29b-41d4-a716-000000000001' as IssueId,
            title: 'Issue A',
            description: 'Authentication failure on login page',
          }),
          createIssueFixture({
            id: '550e8400-e29b-41d4-a716-000000000002' as IssueId,
            title: 'Issue B',
            description: 'Performance improvement',
          }),
        ])

        // Act
        const result = await repository.list({ search: 'authentication' }, { page: 1, limit: 10 })

        // Assert
        expect(result.items).toHaveLength(1)
        expect(result.items[0]!.title).toBe('Issue A')
      })

      it('combines multiple filters with AND logic', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        repository.seed([
          createIssueFixture({
            id: '550e8400-e29b-41d4-a716-000000000001' as IssueId,
            status: 'open',
            priority: 'high',
          }),
          createIssueFixture({
            id: '550e8400-e29b-41d4-a716-000000000002' as IssueId,
            status: 'open',
            priority: 'low',
          }),
          createIssueFixture({
            id: '550e8400-e29b-41d4-a716-000000000003' as IssueId,
            status: 'closed',
            priority: 'high',
          }),
        ])

        // Act
        const result = await repository.list(
          { status: 'open', priority: 'high' },
          { page: 1, limit: 10 },
        )

        // Assert
        expect(result.items).toHaveLength(1)
        expect(result.items[0]!.status).toBe('open')
        expect(result.items[0]!.priority).toBe('high')
      })

      it('returns empty result when no issues match filter', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        repository.seed([
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, status: 'open' }),
        ])

        // Act
        const result = await repository.list({ status: 'closed' }, { page: 1, limit: 10 })

        // Assert
        expect(result.items).toHaveLength(0)
        expect(result.total).toBe(0)
      })
    })

    describe('pagination', () => {
      it('returns paginated results with hasMore', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        repository.seed([
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId }),
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId }),
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as IssueId }),
        ])

        // Act
        const result = await repository.list({}, { page: 1, limit: 2 })

        // Assert
        expect(result.items).toHaveLength(2)
        expect(result.total).toBe(3)
        expect(result.hasMore).toBe(true)
        expect(result.page).toBe(1)
        expect(result.limit).toBe(2)
      })

      it('returns second page of results', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        repository.seed([
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId }),
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId }),
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as IssueId }),
        ])

        // Act
        const result = await repository.list({}, { page: 2, limit: 2 })

        // Assert
        expect(result.items).toHaveLength(1)
        expect(result.total).toBe(3)
        expect(result.hasMore).toBe(false)
      })

      it('returns empty items for beyond-range pages', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        repository.seed([
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId }),
        ])

        // Act
        const result = await repository.list({}, { page: 5, limit: 10 })

        // Assert
        expect(result.items).toHaveLength(0)
        expect(result.total).toBe(1)
        expect(result.hasMore).toBe(false)
      })

      it('total reflects filtered count, not store size', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        repository.seed([
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, status: 'open' }),
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, status: 'closed' }),
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000003' as IssueId, status: 'open' }),
        ])

        // Act
        const result = await repository.list({ status: 'open' }, { page: 1, limit: 10 })

        // Assert
        expect(result.total).toBe(2)
      })
    })

    describe('sorting', () => {
      it('sorts by createdAt descending by default', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        const older: Issue = createIssueFixture({
          id: '550e8400-e29b-41d4-a716-000000000001' as IssueId,
          title: 'Older',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        })
        const newer: Issue = createIssueFixture({
          id: '550e8400-e29b-41d4-a716-000000000002' as IssueId,
          title: 'Newer',
          createdAt: new Date('2025-06-01'),
          updatedAt: new Date('2025-06-01'),
        })
        repository.seed([older, newer])

        // Act
        const result = await repository.list({}, { page: 1, limit: 10 })

        // Assert
        expect(result.items[0]!.title).toBe('Newer')
        expect(result.items[1]!.title).toBe('Older')
      })

      it('sorts by title ascending when specified', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        repository.seed([
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000001' as IssueId, title: 'Bravo' }),
          createIssueFixture({ id: '550e8400-e29b-41d4-a716-000000000002' as IssueId, title: 'Alpha' }),
        ])

        // Act
        const result = await repository.list(
          {},
          { page: 1, limit: 10 },
          { field: 'title', direction: 'asc' },
        )

        // Assert
        expect(result.items[0]!.title).toBe('Alpha')
        expect(result.items[1]!.title).toBe('Bravo')
      })

      it('sorts before pagination', async () => {
        // Arrange
        const repository = new InMemoryIssueRepository()
        repository.seed([
          createIssueFixture({
            id: '550e8400-e29b-41d4-a716-000000000001' as IssueId,
            title: 'C Third',
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
          }),
          createIssueFixture({
            id: '550e8400-e29b-41d4-a716-000000000002' as IssueId,
            title: 'A First',
            createdAt: new Date('2025-03-01'),
            updatedAt: new Date('2025-03-01'),
          }),
          createIssueFixture({
            id: '550e8400-e29b-41d4-a716-000000000003' as IssueId,
            title: 'B Second',
            createdAt: new Date('2025-02-01'),
            updatedAt: new Date('2025-02-01'),
          }),
        ])

        // Act
        const result = await repository.list(
          {},
          { page: 1, limit: 2 },
          { field: 'title', direction: 'asc' },
        )

        // Assert
        expect(result.items[0]!.title).toBe('A First')
        expect(result.items[1]!.title).toBe('B Second')
        expect(result.hasMore).toBe(true)
      })
    })
  })

  describe('seed', () => {
    it('populates the store with provided issues', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      const issue = createIssueFixture()
      repository.seed([issue])

      // Act
      const found = await repository.getById(TEST_ISSUE_ID)

      // Assert
      expect(found).toEqual(issue)
    })

    it('makes seeded issues available via list', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      repository.seed([createIssueFixture()])

      // Act
      const result = await repository.list({}, { page: 1, limit: 10 })

      // Assert
      expect(result.total).toBe(1)
    })

    it('overwrites existing entries with the same ID', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      repository.seed([createIssueFixture({ title: 'Original' })])
      repository.seed([createIssueFixture({ title: 'Overwritten' })])

      // Act
      const found = await repository.getById(TEST_ISSUE_ID)

      // Assert
      expect(found.title).toBe('Overwritten')
    })
  })

  describe('reset', () => {
    it('clears all data from the store', async () => {
      // Arrange
      const repository = new InMemoryIssueRepository()
      repository.seed([createIssueFixture()])

      // Act
      repository.reset()
      const result = await repository.list({}, { page: 1, limit: 10 })

      // Assert
      expect(result.total).toBe(0)
    })

    it('separate instances do not share state', async () => {
      // Arrange
      const repositoryA = new InMemoryIssueRepository()
      const repositoryB = new InMemoryIssueRepository()
      repositoryA.seed([createIssueFixture()])

      // Act
      const resultB = await repositoryB.list({}, { page: 1, limit: 10 })

      // Assert
      expect(resultB.total).toBe(0)
    })
  })
})
