import { AuthorizationError, NotFoundError } from '@meridian/core'
import { describe, expect, it, vi } from 'vitest'

import { SubIssueApiStrategy } from '../../src/strategies/sub-issue-api-strategy.js'

const TEST_CONFIG = { owner: 'test-owner', repo: 'test-repo' }

function createMockOctokit() {
  return { request: vi.fn() }
}

describe('subIssueApiStrategy', () => {
  describe('createLink', () => {
    it('sI-01: calls POST sub_issues with child global ID', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(555)
      const strategy = new SubIssueApiStrategy(octokit, resolveGlobalId)

      octokit.request.mockResolvedValue({ data: {} })

      await strategy.createLink(10, 20, TEST_CONFIG)

      const call = octokit.request.mock.calls[0]!
      expect(call[0]).toContain('POST')
      expect(call[0]).toContain('sub_issues')
      expect(call[1]).toEqual(expect.objectContaining({
        sub_issue_id: 555,
        issue_number: 10,
      }))
    })

    it('sI-02: silently ignores 422 duplicate error', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(555)
      const strategy = new SubIssueApiStrategy(octokit, resolveGlobalId)

      octokit.request.mockRejectedValue({ response: { status: 422 } })

      await expect(strategy.createLink(10, 20, TEST_CONFIG)).resolves.not.toThrow()
    })

    it('sI-03: throws mapped error for non-422', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(555)
      const strategy = new SubIssueApiStrategy(octokit, resolveGlobalId)

      octokit.request.mockRejectedValue({ response: { status: 403 } })

      await expect(strategy.createLink(10, 20, TEST_CONFIG)).rejects.toThrow(AuthorizationError)
    })
  })

  describe('deleteLink', () => {
    it('sI-04: calls DELETE sub_issue with child global ID', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(555)
      const strategy = new SubIssueApiStrategy(octokit, resolveGlobalId)

      octokit.request.mockResolvedValue({ data: {} })

      await strategy.deleteLink(10, 20, TEST_CONFIG)

      const call = octokit.request.mock.calls[0]!
      expect(call[0]).toContain('DELETE')
      expect(call[0]).toContain('sub_issue')
      expect(call[1]).toEqual(expect.objectContaining({
        sub_issue_id: 555,
        issue_number: 10,
      }))
    })

    it('sI-05: throws mapped error', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(555)
      const strategy = new SubIssueApiStrategy(octokit, resolveGlobalId)

      octokit.request.mockRejectedValue({ response: { status: 404 } })

      await expect(strategy.deleteLink(10, 20, TEST_CONFIG)).rejects.toThrow(NotFoundError)
    })
  })

  describe('findLinksByIssue', () => {
    it('sI-06: returns children as type parent', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(12345)
      const strategy = new SubIssueApiStrategy(octokit, resolveGlobalId)

      octokit.request
        .mockResolvedValueOnce({ data: [{ number: 21 }, { number: 22 }] }) // sub_issues
        .mockResolvedValueOnce({ data: null }) // parent

      const result = await strategy.findLinksByIssue(10, TEST_CONFIG)

      expect(result.filter(l => l.type === 'parent')).toHaveLength(2)
    })

    it('sI-07: returns parent as type parent', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(12345)
      const strategy = new SubIssueApiStrategy(octokit, resolveGlobalId)

      octokit.request
        .mockResolvedValueOnce({ data: [] }) // sub_issues (empty)
        .mockResolvedValueOnce({ data: { number: 5 } }) // parent

      const result = await strategy.findLinksByIssue(10, TEST_CONFIG)

      expect(result).toHaveLength(1)
      expect(result[0]!.type).toBe('parent')
      expect(result[0]!.issueNumber).toBe(5)
    })

    it('sI-08: returns both children and parent', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(12345)
      const strategy = new SubIssueApiStrategy(octokit, resolveGlobalId)

      octokit.request
        .mockResolvedValueOnce({ data: [{ number: 21 }] }) // sub_issues
        .mockResolvedValueOnce({ data: { number: 5 } }) // parent

      const result = await strategy.findLinksByIssue(10, TEST_CONFIG)

      expect(result).toHaveLength(2)
    })

    it('sI-09: returns empty on 404 (feature not enabled)', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(12345)
      const strategy = new SubIssueApiStrategy(octokit, resolveGlobalId)

      octokit.request
        .mockRejectedValueOnce({ response: { status: 404 } })
        .mockRejectedValueOnce({ response: { status: 404 } })

      const result = await strategy.findLinksByIssue(10, TEST_CONFIG)

      expect(result).toEqual([])
    })

    it('sI-10: parent returns null data', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(12345)
      const strategy = new SubIssueApiStrategy(octokit, resolveGlobalId)

      octokit.request
        .mockResolvedValueOnce({ data: [] }) // sub_issues
        .mockResolvedValueOnce({ data: null }) // parent returns null

      const result = await strategy.findLinksByIssue(10, TEST_CONFIG)

      // No parent link should be included
      expect(result).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('eC-08: resolveGlobalId called with targetNumber (child) for createLink', async () => {
      const octokit = createMockOctokit()
      const resolveGlobalId = vi.fn().mockResolvedValue(555)
      const strategy = new SubIssueApiStrategy(octokit, resolveGlobalId)

      octokit.request.mockResolvedValue({ data: {} })

      await strategy.createLink(10, 20, TEST_CONFIG)

      expect(resolveGlobalId).toHaveBeenCalledWith(20, TEST_CONFIG)
    })
  })
})
