import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { SortOptions } from '../ports/sort-options.js'

export function paginate<T>(
  items: T[],
  pagination: PaginationParams,
  sort?: SortOptions,
  defaultSortField: string = 'createdAt',
): PaginatedResult<T> {
  const field = sort?.field ?? defaultSortField
  const direction = sort?.direction ?? 'desc'

  const sorted = [...items].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[field]
    const bVal = (b as Record<string, unknown>)[field]

    if (aVal == null && bVal == null)
      return 0
    if (aVal == null)
      return 1
    if (bVal == null)
      return -1

    if (aVal instanceof Date && bVal instanceof Date) {
      return direction === 'asc'
        ? aVal.getTime() - bVal.getTime()
        : bVal.getTime() - aVal.getTime()
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal
    }

    return 0
  })

  const total = sorted.length
  const offset = (pagination.page - 1) * pagination.limit
  const paged = sorted.slice(offset, offset + pagination.limit)
  const hasMore = (pagination.page * pagination.limit) < total

  return {
    items: paged,
    total,
    page: pagination.page,
    limit: pagination.limit,
    hasMore,
  }
}
