import type { Priority } from '../../src/model/priority.js'

import type { Status } from '../../src/model/status.js'
import type { IssueFilterParams } from '../../src/ports/issue-filter-params.js'
import { describe, expect, it } from 'vitest'
import { TEST_PROJECT_ID, TEST_USER_ID } from '../helpers/fixtures.js'

describe('issueFilterParams', () => {
  it('can be created with all fields populated', () => {
    // Arrange
    const filter: IssueFilterParams = {
      projectId: TEST_PROJECT_ID,
      status: 'open' as Status,
      priority: 'high' as Priority,
      assigneeId: TEST_USER_ID,
      search: 'bug fix',
    }

    // Assert
    expect(filter.projectId).toBe(TEST_PROJECT_ID)
    expect(filter.status).toBe('open')
    expect(filter.priority).toBe('high')
    expect(filter.assigneeId).toBe(TEST_USER_ID)
    expect(filter.search).toBe('bug fix')
  })

  it('can be created as an empty object', () => {
    // Arrange
    const filter: IssueFilterParams = {}

    // Assert
    expect(filter.projectId).toBeUndefined()
    expect(filter.status).toBeUndefined()
    expect(filter.priority).toBeUndefined()
    expect(filter.assigneeId).toBeUndefined()
    expect(filter.search).toBeUndefined()
  })

  it('can be created with only projectId', () => {
    // Arrange
    const filter: IssueFilterParams = { projectId: TEST_PROJECT_ID }

    // Assert
    expect(filter.projectId).toBe(TEST_PROJECT_ID)
    expect(filter.status).toBeUndefined()
    expect(filter.priority).toBeUndefined()
    expect(filter.assigneeId).toBeUndefined()
    expect(filter.search).toBeUndefined()
  })

  it('can be created with only status', () => {
    // Arrange
    const filter: IssueFilterParams = { status: 'in_progress' as Status }

    // Assert
    expect(filter.status).toBe('in_progress')
  })

  it('can be created with only priority', () => {
    // Arrange
    const filter: IssueFilterParams = { priority: 'urgent' as Priority }

    // Assert
    expect(filter.priority).toBe('urgent')
  })

  it('can be created with only assigneeId', () => {
    // Arrange
    const filter: IssueFilterParams = { assigneeId: TEST_USER_ID }

    // Assert
    expect(filter.assigneeId).toBe(TEST_USER_ID)
  })

  it('can be created with only search', () => {
    // Arrange
    const filter: IssueFilterParams = { search: 'login bug' }

    // Assert
    expect(filter.search).toBe('login bug')
  })

  it('does not include pagination fields', () => {
    // Arrange
    const filter: IssueFilterParams = { status: 'open' as Status }

    // Act
    const keys = Object.keys(filter)

    // Assert
    expect(keys).not.toContain('page')
    expect(keys).not.toContain('limit')
    expect(keys).toHaveLength(1)
    expect(keys).toContain('status')
  })

  it('can combine multiple filter fields', () => {
    // Arrange
    const filter: IssueFilterParams = {
      status: 'open' as Status,
      priority: 'high' as Priority,
      search: 'critical',
    }

    // Assert
    expect(filter.status).toBe('open')
    expect(filter.priority).toBe('high')
    expect(filter.search).toBe('critical')
    expect(filter.projectId).toBeUndefined()
    expect(filter.assigneeId).toBeUndefined()
  })
})
