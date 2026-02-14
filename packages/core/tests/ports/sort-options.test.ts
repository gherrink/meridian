import type { SortDirection, SortOptions } from '../../src/ports/sort-options.js'

import { describe, expect, it } from 'vitest'

describe('sortOptions', () => {
  it('can be created with ascending direction', () => {
    // Arrange
    const sort: SortOptions = { field: 'createdAt', direction: 'asc' }

    // Assert
    expect(sort.field).toBe('createdAt')
    expect(sort.direction).toBe('asc')
  })

  it('can be created with descending direction', () => {
    // Arrange
    const sort: SortOptions = { field: 'title', direction: 'desc' }

    // Assert
    expect(sort.field).toBe('title')
    expect(sort.direction).toBe('desc')
  })

  it('accepts asc as a standalone SortDirection type', () => {
    // Arrange
    const direction: SortDirection = 'asc'

    // Assert
    expect(direction).toBe('asc')
  })

  it('accepts desc as a standalone SortDirection type', () => {
    // Arrange
    const direction: SortDirection = 'desc'

    // Assert
    expect(direction).toBe('desc')
  })

  it('accepts any string as field name', () => {
    // Arrange
    const sort1: SortOptions = { field: 'priority', direction: 'asc' }
    const sort2: SortOptions = { field: 'updatedAt', direction: 'desc' }
    const sort3: SortOptions = { field: 'status', direction: 'asc' }

    // Assert
    expect(sort1.field).toBe('priority')
    expect(sort2.field).toBe('updatedAt')
    expect(sort3.field).toBe('status')
  })
})
