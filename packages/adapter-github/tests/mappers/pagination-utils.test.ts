import { describe, expect, it } from 'vitest'

import { parseTotalFromLinkHeader } from '../../src/mappers/pagination-utils.js'

describe('paginationUtils', () => {
  describe('parseTotalFromLinkHeader', () => {
    it('pU-01: no link header returns currentPageCount', () => {
      const result = parseTotalFromLinkHeader(undefined, 3, { page: 1, limit: 20 })

      expect(result).toBe(3)
    })

    it('pU-02: link header with last page computes total', () => {
      const linkHeader = '<https://api.github.com/repos/owner/repo/issues?page=5>; rel="last"'

      const result = parseTotalFromLinkHeader(linkHeader, 2, { page: 1, limit: 2 })

      expect(result).toBe(10)
    })

    it('pU-03: on last page uses actual count for remainder', () => {
      const linkHeader = '<https://api.github.com/repos/owner/repo/issues?page=5>; rel="last"'

      const result = parseTotalFromLinkHeader(linkHeader, 1, { page: 5, limit: 2 })

      expect(result).toBe(9)
    })
  })
})
