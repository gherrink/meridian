import type { IssueId, IssueLink, IssueLinkId, MilestoneId } from '@meridian/core'

import { AuthorizationError, DomainError, NotFoundError } from '@meridian/core'
import { describe, expect, it, vi } from 'vitest'

import { GitHubIssueLinkRepository } from '../src/github-issue-link-repository.js'
import { generateDeterministicId, ISSUE_ID_NAMESPACE, ISSUE_LINK_ID_NAMESPACE } from '../src/mappers/deterministic-id.js'
import { GITHUB_ISSUE_OPEN } from './fixtures/github-responses.js'

const TEST_MILESTONE_ID = '550e8400-e29b-41d4-a716-446655440003' as MilestoneId

const TEST_CONFIG = {
  owner: 'test-owner',
  repo: 'test-repo',
  milestoneId: TEST_MILESTONE_ID,
}

function createMockOctokit() {
  return {
    rest: {
      issues: {
        get: vi.fn(),
        update: vi.fn(),
        listForRepo: vi.fn(),
      },
    },
  }
}

function makeIssueId(number: number): IssueId {
  return generateDeterministicId(ISSUE_ID_NAMESPACE, `test-owner/test-repo#${number}`) as IssueId
}

function makeLinkId(sourceNum: number, type: string, targetNum: number): IssueLinkId {
  return generateDeterministicId(ISSUE_LINK_ID_NAMESPACE, `test-owner/test-repo#${sourceNum}:${type}:test-owner/test-repo#${targetNum}`) as IssueLinkId
}

function makeIssueLink(sourceNum: number, targetNum: number, type: string): IssueLink {
  return {
    id: makeLinkId(sourceNum, type, targetNum),
    sourceIssueId: makeIssueId(sourceNum),
    targetIssueId: makeIssueId(targetNum),
    type,
    createdAt: new Date(),
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

describe('gitHubIssueLinkRepository', () => {
  describe('create', () => {
    it('tC-01: creates link on issue with empty body', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, null) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '<!-- meridian:blocks=test-owner/test-repo#2 -->') })

      const link = makeIssueLink(1, 2, 'blocks')
      const result = await repo.create(link)

      expect(octokit.rest.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({
          body: '<!-- meridian:blocks=test-owner/test-repo#2 -->',
        }),
      )
      expect(result.id).toBe(link.id)
      expect(result.sourceIssueId).toBe(link.sourceIssueId)
      expect(result.targetIssueId).toBe(link.targetIssueId)
      expect(result.type).toBe('blocks')
    })

    it('tC-02: creates link on issue with existing text body', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, 'Some description') })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, 'Some description\n<!-- meridian:blocks=test-owner/test-repo#2 -->') })

      const link = makeIssueLink(1, 2, 'blocks')
      await repo.create(link)

      expect(octokit.rest.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('Some description'),
        }),
      )
      expect(octokit.rest.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('<!-- meridian:blocks=test-owner/test-repo#2 -->'),
        }),
      )
    })

    it('tC-03: appends to existing link comments', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(3), 3)
      repo.populateCache(makeIssueId(4), 4)

      const existingBody = 'Some text\n<!-- meridian:blocks=test-owner/test-repo#3 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, existingBody) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      const link = makeIssueLink(1, 4, 'relates-to')
      await repo.create(link)

      const updateCall = octokit.rest.issues.update.mock.calls[0]![0]
      expect(updateCall.body).toContain('<!-- meridian:blocks=test-owner/test-repo#3 -->')
      expect(updateCall.body).toContain('<!-- meridian:relates-to=test-owner/test-repo#4 -->')
      expect(updateCall.body).toContain('Some text')
    })

    it('tC-04: returns the same IssueLink object passed in', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, null) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      const link = makeIssueLink(1, 2, 'blocks')
      const result = await repo.create(link)

      expect(result.id).toBe(link.id)
      expect(result.sourceIssueId).toBe(link.sourceIssueId)
      expect(result.targetIssueId).toBe(link.targetIssueId)
      expect(result.type).toBe(link.type)
    })

    it('tC-05: resolves issue number via lazy cache when not pre-populated', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      // No populateCache calls -- trigger lazy load
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, null), makeGhIssue(2, null)],
        headers: {},
      })
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, null) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      const link = makeIssueLink(1, 2, 'blocks')
      await repo.create(link)

      expect(octokit.rest.issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'all' }),
      )
      expect(octokit.rest.issues.update).toHaveBeenCalled()
    })
  })

  describe('findById', () => {
    it('tC-06: returns matching link from scanned issues', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body)],
        headers: {},
      })

      const linkId = makeLinkId(1, 'blocks', 2)
      const result = await repo.findById(linkId)

      expect(result).not.toBeNull()
      expect(result!.sourceIssueId).toBe(makeIssueId(1))
      expect(result!.targetIssueId).toBe(makeIssueId(2))
      expect(result!.type).toBe('blocks')
    })

    it('tC-07: returns null when no link matches ID', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, 'Just text, no link comments')],
        headers: {},
      })

      const linkId = makeLinkId(1, 'blocks', 2)
      const result = await repo.findById(linkId)

      expect(result).toBeNull()
    })

    it('tC-08: returns null for empty repository', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [],
        headers: {},
      })

      const linkId = makeLinkId(1, 'blocks', 2)
      const result = await repo.findById(linkId)

      expect(result).toBeNull()
    })
  })

  describe('findByIssueId', () => {
    it('tC-09: returns links where issue is source', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->\n<!-- meridian:relates-to=test-owner/test-repo#3 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body)],
        headers: {},
      })

      const result = await repo.findByIssueId(makeIssueId(1))

      expect(result).toHaveLength(2)
    })

    it('tC-10: returns links where issue is target', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      const body = '<!-- meridian:blocks=test-owner/test-repo#1 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(5, body)],
        headers: {},
      })

      const result = await repo.findByIssueId(makeIssueId(1))

      expect(result.length).toBeGreaterThanOrEqual(1)
      const link = result.find(l => l.sourceIssueId === makeIssueId(5))
      expect(link).toBeDefined()
    })

    it('tC-11: filters by type', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->\n<!-- meridian:relates-to=test-owner/test-repo#3 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body)],
        headers: {},
      })

      const result = await repo.findByIssueId(makeIssueId(1), { type: 'blocks' })

      expect(result).toHaveLength(1)
      expect(result[0]!.type).toBe('blocks')
    })

    it('tC-12: returns empty array when issue has no links', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, 'Just text, no links')],
        headers: {},
      })

      const result = await repo.findByIssueId(makeIssueId(1))

      expect(result).toEqual([])
    })
  })

  describe('findBySourceAndTargetAndType', () => {
    it('tC-13: finds exact match', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body) })

      const result = await repo.findBySourceAndTargetAndType(makeIssueId(1), makeIssueId(2), 'blocks')

      expect(result).not.toBeNull()
      expect(result!.sourceIssueId).toBe(makeIssueId(1))
      expect(result!.targetIssueId).toBe(makeIssueId(2))
      expect(result!.type).toBe('blocks')
    })

    it('tC-14: returns null when type mismatch', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body) })

      const result = await repo.findBySourceAndTargetAndType(makeIssueId(1), makeIssueId(2), 'relates-to')

      expect(result).toBeNull()
    })

    it('tC-15: returns null when target mismatch', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(3), 3)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body) })

      const result = await repo.findBySourceAndTargetAndType(makeIssueId(1), makeIssueId(3), 'blocks')

      expect(result).toBeNull()
    })

    it('tC-16: returns null for empty body', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, null) })

      const result = await repo.findBySourceAndTargetAndType(makeIssueId(1), makeIssueId(2), 'blocks')

      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('tC-17: removes link comment from body', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body), makeGhIssue(2, null)],
        headers: {},
      })
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      const linkId = makeLinkId(1, 'blocks', 2)
      await repo.delete(linkId)

      expect(octokit.rest.issues.update).toHaveBeenCalled()
      const updateCall = octokit.rest.issues.update.mock.calls[0]![0]
      expect(updateCall.body).not.toContain('<!-- meridian:blocks=test-owner/test-repo#2 -->')
    })

    it('tC-18: preserves other link comments when deleting one', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)
      repo.populateCache(makeIssueId(3), 3)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->\n<!-- meridian:relates-to=test-owner/test-repo#3 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body), makeGhIssue(2, null), makeGhIssue(3, null)],
        headers: {},
      })
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      const linkId = makeLinkId(1, 'blocks', 2)
      await repo.delete(linkId)

      const updateCall = octokit.rest.issues.update.mock.calls[0]![0]
      expect(updateCall.body).toContain('<!-- meridian:relates-to=test-owner/test-repo#3 -->')
    })

    it('tC-19: preserves body text after link removal', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      const body = 'Description\n<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body), makeGhIssue(2, null)],
        headers: {},
      })
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, 'Description') })

      const linkId = makeLinkId(1, 'blocks', 2)
      await repo.delete(linkId)

      const updateCall = octokit.rest.issues.update.mock.calls[0]![0]
      expect(updateCall.body.trim()).toBe('Description')
    })

    it('tC-20: throws NotFoundError for unknown link ID', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [],
        headers: {},
      })

      const unknownLinkId = makeLinkId(99, 'blocks', 100)

      await expect(repo.delete(unknownLinkId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('deleteByIssueId', () => {
    it('tC-21: removes outgoing links from issue body', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body) })
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [],
        headers: {},
      })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      await repo.deleteByIssueId(makeIssueId(1))

      expect(octokit.rest.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_number: 1,
        }),
      )
    })

    it('tC-22: removes incoming links from other issues', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)

      // Issue #1 has no outgoing links
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, null) })

      // Issue #5 has incoming link to #1
      const body5 = '<!-- meridian:blocks=test-owner/test-repo#1 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, null), makeGhIssue(5, body5)],
        headers: {},
      })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(5, '') })

      await repo.deleteByIssueId(makeIssueId(1))

      expect(octokit.rest.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_number: 5,
        }),
      )
    })

    it('tC-23: handles both outgoing and incoming', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)

      // Issue #1 has outgoing blocks#2
      const body1 = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body1) })

      // Issue #5 has relates-to#1
      const body5 = '<!-- meridian:relates-to=test-owner/test-repo#1 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body1), makeGhIssue(5, body5)],
        headers: {},
      })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      await repo.deleteByIssueId(makeIssueId(1))

      // Both issue #1 and #5 should have update called
      const updateCalls = octokit.rest.issues.update.mock.calls
      const updatedIssueNumbers = updateCalls.map((c: any) => c[0].issue_number)
      expect(updatedIssueNumbers).toContain(1)
      expect(updatedIssueNumbers).toContain(5)
    })

    it('tC-24: no-op when issue has no links anywhere', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)

      // Issue #1 has no outgoing links
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, null) })

      // No other issues have links to #1
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, null), makeGhIssue(5, 'Some text, no links')],
        headers: {},
      })

      await repo.deleteByIssueId(makeIssueId(1))

      expect(octokit.rest.issues.update).not.toHaveBeenCalled()
    })

    it('tC-25: preserves unrelated links on other issues', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)

      // Issue #1 has no outgoing links
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, null) })

      // Issue #5 has blocks#1 (incoming) + relates-to#3 (unrelated)
      const body5 = '<!-- meridian:blocks=test-owner/test-repo#1 -->\n<!-- meridian:relates-to=test-owner/test-repo#3 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, null), makeGhIssue(5, body5)],
        headers: {},
      })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(5, '') })

      await repo.deleteByIssueId(makeIssueId(1))

      const updateCall = octokit.rest.issues.update.mock.calls[0]![0]
      expect(updateCall.body).toContain('<!-- meridian:relates-to=test-owner/test-repo#3 -->')
      expect(updateCall.body).not.toContain('<!-- meridian:blocks=test-owner/test-repo#1 -->')
    })
  })

  describe('cache & resolution', () => {
    it('tC-26: populateCache sets issueId-to-number mapping', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(42), 42)
      repo.populateCache(makeIssueId(2), 2)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(42, null) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(42, body) })

      const link = makeIssueLink(42, 2, 'blocks')
      await repo.create(link)

      expect(octokit.rest.issues.get).toHaveBeenCalledWith(
        expect.objectContaining({ issue_number: 42 }),
      )
      expect(octokit.rest.issues.listForRepo).not.toHaveBeenCalled()
    })

    it('tC-27: resolveIssueNumber throws NotFoundError for unknown ID after cache populated', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, null)],
        headers: {},
      })

      const link = makeIssueLink(999, 1, 'blocks')

      await expect(repo.create(link)).rejects.toThrow(NotFoundError)
    })

    it('tC-28: scanAllIssuesForLinks filters pull requests', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      const prIssue = { ...makeGhIssue(2, '<!-- meridian:blocks=test-owner/test-repo#3 -->'), pull_request: {} }
      const regularIssue = makeGhIssue(1, '<!-- meridian:blocks=test-owner/test-repo#4 -->')

      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [prIssue, regularIssue],
        headers: {},
      })

      const result = await repo.findByIssueId(makeIssueId(1))

      // Should only find links from issue#1, not from the PR
      const fromPR = result.filter(l => l.sourceIssueId === makeIssueId(2))
      expect(fromPR).toHaveLength(0)
    })

    it('tC-29: deterministic IDs are consistent', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, null) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, body) })

      const link = makeIssueLink(1, 2, 'blocks')
      await repo.create(link)

      // Now findById with the same computed ID
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body)],
        headers: {},
      })

      const found = await repo.findById(link.id)

      expect(found).not.toBeNull()
      expect(found!.id).toBe(link.id)
    })
  })

  describe('error mapping', () => {
    it('tC-30: fetchIssueBody maps 404 to NotFoundError', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      octokit.rest.issues.get.mockRejectedValue({ response: { status: 404 } })

      const link = makeIssueLink(1, 2, 'blocks')

      await expect(repo.create(link)).rejects.toThrow(NotFoundError)
    })

    it('tC-31: updateIssueBody maps 403 to AuthorizationError', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, null) })
      octokit.rest.issues.update.mockRejectedValue({ response: { status: 403 } })

      const link = makeIssueLink(1, 2, 'blocks')

      await expect(repo.create(link)).rejects.toThrow(AuthorizationError)
    })

    it('tC-32: fetchAllIssues maps API error', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      octokit.rest.issues.listForRepo.mockRejectedValue({ response: { status: 500 } })

      const linkId = makeLinkId(1, 'blocks', 2)

      await expect(repo.findById(linkId)).rejects.toThrow(DomainError)
    })
  })

  describe('edge cases', () => {
    it('tC-33: body is empty string', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, '') })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      const link = makeIssueLink(1, 2, 'blocks')
      await repo.create(link)

      const updateCall = octokit.rest.issues.update.mock.calls[0]![0]
      expect(updateCall.body).toContain('<!-- meridian:blocks=test-owner/test-repo#2 -->')
    })

    it('tC-34: body has only whitespace', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, '  \n  ') })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      const link = makeIssueLink(1, 2, 'blocks')
      await repo.create(link)

      const updateCall = octokit.rest.issues.update.mock.calls[0]![0]
      // After trimming whitespace, body should contain just the link comment
      expect(updateCall.body).toContain('<!-- meridian:blocks=test-owner/test-repo#2 -->')
    })

    it('tC-35: body has link comments but no text', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body), makeGhIssue(2, null)],
        headers: {},
      })
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      const linkId = makeLinkId(1, 'blocks', 2)
      await repo.delete(linkId)

      const updateCall = octokit.rest.issues.update.mock.calls[0]![0]
      // After stripping the only link, body should be empty
      expect(updateCall.body.trim()).toBe('')
    })

    it('tC-36: multiple links to same target different types', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->\n<!-- meridian:relates-to=test-owner/test-repo#2 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body)],
        headers: {},
      })

      const result = await repo.findByIssueId(makeIssueId(1))

      expect(result).toHaveLength(2)
      const ids = result.map(l => l.id)
      expect(new Set(ids).size).toBe(2) // Different IDs
    })

    it('tC-37: pagination in fetchAllIssues', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      // Page 1: 100 issues
      const page1 = Array.from({ length: 100 }, (_, i) => makeGhIssue(i + 1, null))
      // Page 2: 50 issues, one with a link
      const page2Items = Array.from({ length: 49 }, (_, i) => makeGhIssue(101 + i, null))
      page2Items.push(makeGhIssue(150, '<!-- meridian:blocks=test-owner/test-repo#1 -->'))

      octokit.rest.issues.listForRepo
        .mockResolvedValueOnce({ data: page1, headers: {} })
        .mockResolvedValueOnce({ data: page2Items, headers: {} })

      const result = await repo.findByIssueId(makeIssueId(150))

      // Should find the link from issue#150
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it('tC-38: listForRepo returns non-array data', async () => {
      const octokit = createMockOctokit()
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: null,
        headers: {},
      })

      const result = await repo.findByIssueId(makeIssueId(1))

      expect(result).toEqual([])
    })
  })
})
