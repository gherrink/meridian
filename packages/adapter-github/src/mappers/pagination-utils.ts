import type { PaginationParams } from '@meridian/core'

export function parseTotalFromLinkHeader(
  linkHeader: string | undefined,
  currentPageCount: number,
  pagination: PaginationParams,
): number {
  if (linkHeader === undefined) {
    return (pagination.page - 1) * pagination.limit + currentPageCount
  }

  const lastMatch = linkHeader.match(/[&?]page=(\d+)[^>]*>;\s*rel="last"/)
  if (lastMatch?.[1] !== undefined) {
    const lastPage = Number.parseInt(lastMatch[1], 10)
    return lastPage * pagination.limit
  }

  return (pagination.page - 1) * pagination.limit + currentPageCount
}
