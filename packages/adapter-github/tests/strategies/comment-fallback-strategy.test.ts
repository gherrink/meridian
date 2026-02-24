import { describe, expect, it, vi } from 'vitest'

import { CommentFallbackStrategy } from '../../src/strategies/comment-fallback-strategy.js'
import { GITHUB_ISSUE_OPEN } from '../fixtures/github-responses.js'

const TEST_CONFIG = { owner: 'test-owner', repo: 'test-repo' }

function createMockOctokit() {
  return {
    rest: {
      issues: {
        get: vi.fn(),
        update: vi.fn(),
      },
    },
  }
}

function makeGhIssue(number: number, body: string | null) {
  return {
    ...GITHUB_ISSUE_OPEN,
    number,
    body,
    html_url: `https://github.com/test-owner/test-repo/issues/${number}`,
  }
}

describe('commentFallbackStrategy', () => {
  describe('createLink', () => {
    it('cF-01: appends comment to empty body', async () => {
      const octokit = createMockOctokit()
      const strategy = new CommentFallbackStrategy(octokit, 'duplicates')

      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, null) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      await strategy.createLink(1, 2, TEST_CONFIG)

      expect(octokit.rest.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('<!-- meridian:duplicates=test-owner/test-repo#2 -->'),
        }),
      )
    })

    it('cF-02: appends to existing body preserving content', async () => {
      const octokit = createMockOctokit()
      const strategy = new CommentFallbackStrategy(octokit, 'duplicates')

      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, 'Description') })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      await strategy.createLink(1, 2, TEST_CONFIG)

      const updateCall = octokit.rest.issues.update.mock.calls[0]![0]
      expect(updateCall.body).toContain('Description')
      expect(updateCall.body).toContain('<!-- meridian:duplicates=test-owner/test-repo#2 -->')
    })

    it('cF-03: appends to body with existing links', async () => {
      const octokit = createMockOctokit()
      const strategy = new CommentFallbackStrategy(octokit, 'duplicates')

      const existingBody = 'Some text\n<!-- meridian:relates-to=test-owner/test-repo#3 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, existingBody) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      await strategy.createLink(1, 2, TEST_CONFIG)

      const updateCall = octokit.rest.issues.update.mock.calls[0]![0]
      expect(updateCall.body).toContain('<!-- meridian:relates-to=test-owner/test-repo#3 -->')
      expect(updateCall.body).toContain('<!-- meridian:duplicates=test-owner/test-repo#2 -->')
    })
  })

  describe('deleteLink', () => {
    it('cF-04: removes matching link comment', async () => {
      const octokit = createMockOctokit()
      const strategy = new CommentFallbackStrategy(octokit, 'duplicates')

      const body = '<!-- meridian:duplicates=test-owner/test-repo#2 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      await strategy.deleteLink(1, 2, TEST_CONFIG)

      const updateCall = octokit.rest.issues.update.mock.calls[0]![0]
      expect(updateCall.body).not.toContain('<!-- meridian:duplicates=test-owner/test-repo#2 -->')
    })

    it('cF-05: preserves other link comments', async () => {
      const octokit = createMockOctokit()
      const strategy = new CommentFallbackStrategy(octokit, 'duplicates')

      const body = '<!-- meridian:duplicates=test-owner/test-repo#2 -->\n<!-- meridian:relates-to=test-owner/test-repo#3 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      await strategy.deleteLink(1, 2, TEST_CONFIG)

      const updateCall = octokit.rest.issues.update.mock.calls[0]![0]
      expect(updateCall.body).toContain('<!-- meridian:relates-to=test-owner/test-repo#3 -->')
    })
  })

  describe('findLinksByIssue', () => {
    it('cF-06: returns only links matching strategy type', async () => {
      const octokit = createMockOctokit()
      const strategy = new CommentFallbackStrategy(octokit, 'duplicates')

      const body = '<!-- meridian:duplicates=test-owner/test-repo#2 -->\n<!-- meridian:relates-to=test-owner/test-repo#3 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body) })

      const result = await strategy.findLinksByIssue(1, TEST_CONFIG)

      expect(result).toHaveLength(1)
      expect(result[0]!.issueNumber).toBe(2)
    })

    it('cF-07: returns empty for null body', async () => {
      const octokit = createMockOctokit()
      const strategy = new CommentFallbackStrategy(octokit, 'duplicates')

      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, null) })

      const result = await strategy.findLinksByIssue(1, TEST_CONFIG)

      expect(result).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('eC-10: deleteLink on issue with no matching link type', async () => {
      const octokit = createMockOctokit()
      const strategy = new CommentFallbackStrategy(octokit, 'duplicates')

      const body = '<!-- meridian:relates-to=test-owner/test-repo#3 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      await strategy.deleteLink(1, 3, TEST_CONFIG)

      const updateCall = octokit.rest.issues.update.mock.calls[0]![0]
      expect(updateCall.body).toContain('<!-- meridian:relates-to=test-owner/test-repo#3 -->')
    })
  })
})
