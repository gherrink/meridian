import type { PaginationParams } from '@meridian/core'

export function parseTotalFromLinkHeader(
  linkHeader: string | undefined,
  currentPageCount: number,
  pagination: PaginationParams,
): number {
  if (linkHeader === undefined) {
    return (pagination.page - 1) * pagination.limit + currentPageCount
  }

  const lastMatch = linkHeader.match(/[&?]page=(\d+)(?:&[^>]*)?>;\s*rel="last"/)
  if (lastMatch?.[1] !== undefined) {
    const lastPage = Number.parseInt(lastMatch[1], 10)

    if (pagination.page === lastPage) {
      return (lastPage - 1) * pagination.limit + currentPageCount
    }

    // When not on the last page, we cannot know the exact item count on the
    // final page. This is an upper-bound approximation that assumes the last
    // page is full. GitHub does not expose a total count header for list
    // endpoints, so this is the best estimate available from Link headers.
    return lastPage * pagination.limit
  }

  return (pagination.page - 1) * pagination.limit + currentPageCount
}
