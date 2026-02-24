import { DomainError, NotFoundError } from '@meridian/core'
import { describe, expect, it, vi } from 'vitest'

import { DependencyApiStrategy } from '../../src/strategies/dependency-api-strategy.js'

const TEST_CONFIG = { owner: 'test-owner', repo: 'test-repo' }

function createMockOctokit() {
  return { request: vi.fn() }
}

describe('dependencyApiStrategy', () => {
  describe('createLink', () => {
    it('dS-01: calls POST blocked_by on target issue', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(111)
      const strategy = new DependencyApiStrategy(octokit, resolveGlobalId)

      octokit.request.mockResolvedValue({ data: {} })

      await strategy.createLink(1, 2, TEST_CONFIG)

      const call = octokit.request.mock.calls[0]!
      expect(call[0]).toContain('POST')
      expect(call[0]).toContain('blocked_by')
      expect(call[1]).toEqual(expect.objectContaining({
        blocked_by_issue_id: 111,
        issue_number: 2,
      }))
    })

    it('dS-02: silently ignores 422 duplicate error', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(111)
      const strategy = new DependencyApiStrategy(octokit, resolveGlobalId)

      octokit.request.mockRejectedValue({ response: { status: 422 } })

      await expect(strategy.createLink(1, 2, TEST_CONFIG)).resolves.not.toThrow()
    })

    it('dS-03: throws mapped error for non-422', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(111)
      const strategy = new DependencyApiStrategy(octokit, resolveGlobalId)

      octokit.request.mockRejectedValue({ response: { status: 500 } })

      await expect(strategy.createLink(1, 2, TEST_CONFIG)).rejects.toThrow(DomainError)
    })
  })

  describe('deleteLink', () => {
    it('dS-04: calls DELETE blocked_by on target issue', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(111)
      const strategy = new DependencyApiStrategy(octokit, resolveGlobalId)

      octokit.request.mockResolvedValue({ data: {} })

      await strategy.deleteLink(1, 2, TEST_CONFIG)

      const call = octokit.request.mock.calls[0]!
      expect(call[0]).toContain('DELETE')
      expect(call[0]).toContain('blocked_by')
      expect(call[1]).toEqual(expect.objectContaining({
        blocked_by_issue_id: 111,
        issue_number: 2,
      }))
    })

    it('dS-05: throws mapped error', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(111)
      const strategy = new DependencyApiStrategy(octokit, resolveGlobalId)

      octokit.request.mockRejectedValue({ response: { status: 404 } })

      await expect(strategy.deleteLink(1, 2, TEST_CONFIG)).rejects.toThrow(NotFoundError)
    })
  })

  describe('findLinksByIssue', () => {
    it('dS-06: returns blocks links from both directions', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(12345)
      const strategy = new DependencyApiStrategy(octokit, resolveGlobalId)

      octokit.request
        .mockResolvedValueOnce({ data: [{ number: 3 }] }) // blocked_by
        .mockResolvedValueOnce({ data: [{ number: 5 }] }) // blocking

      const result = await strategy.findLinksByIssue(1, TEST_CONFIG)

      expect(result).toHaveLength(2)
      expect(result.every(l => l.type === 'blocks')).toBe(true)
    })

    it('dS-07: returns empty when 404 (feature not enabled)', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(12345)
      const strategy = new DependencyApiStrategy(octokit, resolveGlobalId)

      octokit.request
        .mockRejectedValueOnce({ response: { status: 404 } })
        .mockRejectedValueOnce({ response: { status: 404 } })

      const result = await strategy.findLinksByIssue(1, TEST_CONFIG)

      expect(result).toEqual([])
    })

    it('dS-08: returns empty when data not array', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(12345)
      const strategy = new DependencyApiStrategy(octokit, resolveGlobalId)

      octokit.request
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: {} })

      const result = await strategy.findLinksByIssue(1, TEST_CONFIG)

      expect(result).toEqual([])
    })

    it('dS-09: throws on non-404 error', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(12345)
      const strategy = new DependencyApiStrategy(octokit, resolveGlobalId)

      octokit.request.mockRejectedValueOnce({ response: { status: 500 } })

      await expect(strategy.findLinksByIssue(1, TEST_CONFIG)).rejects.toThrow(DomainError)
    })
  })

  describe('edge cases', () => {
    it('eC-07: resolveGlobalId called with sourceNumber for createLink', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(111)
      const strategy = new DependencyApiStrategy(octokit, resolveGlobalId)

      octokit.request.mockResolvedValue({ data: {} })

      await strategy.createLink(1, 2, TEST_CONFIG)

      expect(resolveGlobalId).toHaveBeenCalledWith(1, TEST_CONFIG)
    })
  })
})
