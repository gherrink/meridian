import { describe, expect, it } from 'vitest'
import { paginate } from '../../src/adapters/paginate.js'

describe('paginate utility', () => {
  it('pA-01: empty array returns zero items', () => {
    // Arrange & Act
    const result = paginate([], { page: 1, limit: 10 })

    // Assert
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
    expect(result.page).toBe(1)
    expect(result.hasMore).toBe(false)
  })

  it('pA-02: sorts by createdAt desc by default', () => {
    // Arrange
    const older = { title: 'Older', createdAt: new Date('2025-01-01') }
    const newer = { title: 'Newer', createdAt: new Date('2025-06-01') }

    // Act
    const result = paginate([older, newer], { page: 1, limit: 10 })

    // Assert
    expect(result.items[0]!.createdAt.getTime()).toBeGreaterThan(result.items[1]!.createdAt.getTime())
  })

  it('pA-03: sorts by string field ascending', () => {
    // Arrange
    const items = [
      { title: 'Bravo', createdAt: new Date() },
      { title: 'Alpha', createdAt: new Date() },
    ]

    // Act
    const result = paginate(items, { page: 1, limit: 10 }, { field: 'title', direction: 'asc' })

    // Assert
    expect(result.items[0]!.title).toBe('Alpha')
    expect(result.items[1]!.title).toBe('Bravo')
  })

  it('pA-04: sorts by string field descending', () => {
    // Arrange
    const items = [
      { title: 'Alpha', createdAt: new Date() },
      { title: 'Bravo', createdAt: new Date() },
    ]

    // Act
    const result = paginate(items, { page: 1, limit: 10 }, { field: 'title', direction: 'desc' })

    // Assert
    expect(result.items[0]!.title).toBe('Bravo')
    expect(result.items[1]!.title).toBe('Alpha')
  })

  it('pA-05: sorts by number field ascending', () => {
    // Arrange
    const items = [
      { value: 30, createdAt: new Date() },
      { value: 10, createdAt: new Date() },
      { value: 20, createdAt: new Date() },
    ]

    // Act
    const result = paginate(items, { page: 1, limit: 10 }, { field: 'value', direction: 'asc' })

    // Assert
    expect(result.items[0]!.value).toBe(10)
    expect(result.items[1]!.value).toBe(20)
    expect(result.items[2]!.value).toBe(30)
  })

  it('pA-06: sorts by number field descending', () => {
    // Arrange
    const items = [
      { value: 10, createdAt: new Date() },
      { value: 30, createdAt: new Date() },
      { value: 20, createdAt: new Date() },
    ]

    // Act
    const result = paginate(items, { page: 1, limit: 10 }, { field: 'value', direction: 'desc' })

    // Assert
    expect(result.items[0]!.value).toBe(30)
    expect(result.items[1]!.value).toBe(20)
    expect(result.items[2]!.value).toBe(10)
  })

  it('pA-07: sorts by Date field ascending', () => {
    // Arrange
    const older = { createdAt: new Date('2025-01-01') }
    const newer = { createdAt: new Date('2025-06-01') }

    // Act
    const result = paginate([newer, older], { page: 1, limit: 10 }, { field: 'createdAt', direction: 'asc' })

    // Assert
    expect(result.items[0]!.createdAt.getTime()).toBeLessThan(result.items[1]!.createdAt.getTime())
  })

  it('pA-08: null values sort to end', () => {
    // Arrange
    const items = [
      { name: null as string | null, createdAt: new Date() },
      { name: 'Alice', createdAt: new Date() },
    ]

    // Act
    const result = paginate(items, { page: 1, limit: 10 }, { field: 'name', direction: 'asc' })

    // Assert
    expect(result.items[0]!.name).toBe('Alice')
    expect(result.items[1]!.name).toBeNull()
  })

  it('pA-09: both null values maintain order (return 0)', () => {
    // Arrange
    const items = [
      { name: null as string | null, createdAt: new Date() },
      { name: null as string | null, createdAt: new Date() },
    ]

    // Act
    const result = paginate(items, { page: 1, limit: 10 }, { field: 'name', direction: 'asc' })

    // Assert
    expect(result.items).toHaveLength(2)
  })

  it('pA-10: non-comparable types return 0', () => {
    // Arrange
    const items = [
      { flag: true, createdAt: new Date() },
      { flag: false, createdAt: new Date() },
    ]

    // Act
    const result = paginate(items, { page: 1, limit: 10 }, { field: 'flag', direction: 'asc' })

    // Assert
    expect(result.items).toHaveLength(2)
  })

  it('pA-11: page beyond total returns empty items', () => {
    // Arrange
    const items = Array.from({ length: 5 }, (_, i) => ({ id: i, createdAt: new Date() }))

    // Act
    const result = paginate(items, { page: 10, limit: 5 })

    // Assert
    expect(result.items).toEqual([])
    expect(result.total).toBe(5)
    expect(result.hasMore).toBe(false)
  })

  it('pA-12: hasMore true when more pages exist', () => {
    // Arrange
    const items = Array.from({ length: 3 }, (_, i) => ({ id: i, createdAt: new Date() }))

    // Act
    const result = paginate(items, { page: 1, limit: 2 })

    // Assert
    expect(result.items).toHaveLength(2)
    expect(result.hasMore).toBe(true)
  })

  it('pA-13: hasMore false on last page', () => {
    // Arrange
    const items = Array.from({ length: 3 }, (_, i) => ({ id: i, createdAt: new Date() }))

    // Act
    const result = paginate(items, { page: 2, limit: 2 })

    // Assert
    expect(result.items).toHaveLength(1)
    expect(result.hasMore).toBe(false)
  })

  it('pA-14: hasMore false when exact fit', () => {
    // Arrange
    const items = Array.from({ length: 4 }, (_, i) => ({ id: i, createdAt: new Date() }))

    // Act
    const result = paginate(items, { page: 2, limit: 2 })

    // Assert
    expect(result.items).toHaveLength(2)
    expect(result.hasMore).toBe(false)
  })

  it('pA-15: custom defaultSortField param', () => {
    // Arrange
    const items = [
      { name: 'Charlie', createdAt: new Date() },
      { name: 'Alice', createdAt: new Date() },
      { name: 'Bravo', createdAt: new Date() },
    ]

    // Act
    const result = paginate(items, { page: 1, limit: 10 }, undefined, 'name')

    // Assert
    // Default direction is 'desc', so should sort by name descending
    expect(result.items[0]!.name).toBe('Charlie')
    expect(result.items[1]!.name).toBe('Bravo')
    expect(result.items[2]!.name).toBe('Alice')
  })

  it('pA-16: pagination offset calc: page 3 limit 2', () => {
    // Arrange
    const items = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      createdAt: new Date(2025, 0, i + 1),
    }))

    // Act
    const result = paginate(items, { page: 3, limit: 2 })

    // Assert
    // Default sort is createdAt desc: [5,4,3,2,1,0]
    // Page 3 with limit 2: offset=4, so items at index 4,5 in sorted order = ids 1, 0
    expect(result.items[0]!.id).toBe(1)
  })

  it('eC-06: paginate with page=1 limit=1 on single item', () => {
    // Arrange
    const items = [{ id: 1, createdAt: new Date() }]

    // Act
    const result = paginate(items, { page: 1, limit: 1 })

    // Assert
    expect(result.items).toHaveLength(1)
    expect(result.hasMore).toBe(false)
    expect(result.total).toBe(1)
  })
})
