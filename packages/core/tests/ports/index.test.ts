import type {
  ICommentRepository,
  IIssueRepository,
  IMilestoneRepository,
  IssueFilterParams,
  IUserRepository,
  SortDirection,
  SortOptions,
} from '../../src/ports/index.js'

import { describe, expect, it, vi } from 'vitest'

describe('ports barrel export', () => {
  it('re-exports IIssueRepository type', () => {
    // Arrange
    const mock: IIssueRepository = {
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    }

    // Assert
    expect(mock).toBeDefined()
    expect(Object.keys(mock)).toHaveLength(5)
    expect(typeof mock.create).toBe('function')
    expect(typeof mock.getById).toBe('function')
    expect(typeof mock.update).toBe('function')
    expect(typeof mock.delete).toBe('function')
    expect(typeof mock.list).toBe('function')
  })

  it('re-exports IMilestoneRepository type', () => {
    // Arrange
    const mock: IMilestoneRepository = {
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    }

    // Assert
    expect(mock).toBeDefined()
    expect(Object.keys(mock)).toHaveLength(5)
  })

  it('re-exports ICommentRepository type', () => {
    // Arrange
    const mock: ICommentRepository = {
      create: vi.fn(),
      getByIssueId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    // Assert
    expect(mock).toBeDefined()
    expect(Object.keys(mock)).toHaveLength(4)
  })

  it('re-exports IUserRepository type', () => {
    // Arrange
    const mock: IUserRepository = {
      getById: vi.fn(),
      getCurrent: vi.fn(),
      search: vi.fn(),
    }

    // Assert
    expect(mock).toBeDefined()
    expect(Object.keys(mock)).toHaveLength(3)
  })

  it('re-exports SortOptions and SortDirection types', () => {
    // Arrange
    const sort: SortOptions = { field: 'createdAt', direction: 'asc' }
    const direction: SortDirection = 'desc'

    // Assert
    expect(sort.field).toBe('createdAt')
    expect(direction).toBe('desc')
  })

  it('re-exports IssueFilterParams type', () => {
    // Arrange
    const filter: IssueFilterParams = { status: 'open' }

    // Assert
    expect(filter.status).toBe('open')
  })
})
