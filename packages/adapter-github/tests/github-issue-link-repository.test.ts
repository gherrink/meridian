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

function createMockOctokitWithRequest() {
  return {
    rest: {
      issues: {
        get: vi.fn(),
        update: vi.fn(),
        listForRepo: vi.fn(),
      },
    },
    request: vi.fn(),
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

  describe('native API integration', () => {
    it('tC-39: create uses native dependency API for blocks type when request available', async () => {
      const octokit = createMockOctokitWithRequest()
      const repo = new GitHubIssueLinkRepository(octokit as any, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      // resolveIssueGlobalId needs issues.get to return id
      octokit.rest.issues.get.mockResolvedValue({ data: { ...makeGhIssue(1, null), id: 111 } })
      octokit.request.mockResolvedValue({ data: {} })

      const link = makeIssueLink(1, 2, 'blocks')
      await repo.create(link)

      expect(octokit.request).toHaveBeenCalledWith(
        expect.stringContaining('blocked_by'),
        expect.any(Object),
      )
    })

    it('tC-40: create falls back to comment when native API fails', async () => {
      const octokit = createMockOctokitWithRequest()
      const repo = new GitHubIssueLinkRepository(octokit as any, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      // resolveIssueGlobalId returns an id
      octokit.rest.issues.get.mockResolvedValue({ data: { ...makeGhIssue(1, null), id: 111 } })
      // native request fails
      octokit.request.mockRejectedValue({ response: { status: 500 } })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      const link = makeIssueLink(1, 2, 'blocks')
      await repo.create(link)

      // Should fall back to comment-based update
      expect(octokit.rest.issues.update).toHaveBeenCalled()
    })

    it('tC-41: create uses comment strategy for relates-to type', async () => {
      const octokit = createMockOctokitWithRequest()
      const repo = new GitHubIssueLinkRepository(octokit as any, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      // For comment strategy, get is called to read the body, then update to write
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, null) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      const link = makeIssueLink(1, 2, 'relates-to')
      await repo.create(link)

      // relates-to is a comment strategy, it uses rest.issues.get + update
      expect(octokit.rest.issues.get).toHaveBeenCalled()
      expect(octokit.rest.issues.update).toHaveBeenCalled()
    })

    it('tC-42: create uses comment fallback when octokit.request is undefined', async () => {
      const octokit = createMockOctokit() // no request
      const repo = new GitHubIssueLinkRepository(octokit, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, null) })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      const link = makeIssueLink(1, 2, 'blocks')
      await repo.create(link)

      expect(octokit.rest.issues.update).toHaveBeenCalled()
    })

    it('tC-43: delete uses native dependency API for blocks when available', async () => {
      const octokit = createMockOctokitWithRequest()
      const repo = new GitHubIssueLinkRepository(octokit as any, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      // scanAllIssuesForLinks returns blocks link
      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body), makeGhIssue(2, null)],
        headers: {},
      })

      // resolveIssueGlobalId
      octokit.rest.issues.get.mockResolvedValue({ data: { ...makeGhIssue(1, body), id: 111 } })
      octokit.request.mockResolvedValue({ data: {} })

      const linkId = makeLinkId(1, 'blocks', 2)
      await repo.delete(linkId)

      expect(octokit.request).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.any(Object),
      )
    })

    it('tC-44: delete falls back to comment when native delete fails', async () => {
      const octokit = createMockOctokitWithRequest()
      const repo = new GitHubIssueLinkRepository(octokit as any, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body), makeGhIssue(2, null)],
        headers: {},
      })

      // resolveIssueGlobalId
      octokit.rest.issues.get.mockResolvedValue({ data: { ...makeGhIssue(1, body), id: 111 } })
      // native request fails
      octokit.request.mockRejectedValue({ response: { status: 500 } })
      octokit.rest.issues.update.mockResolvedValue({ data: makeGhIssue(1, '') })

      const linkId = makeLinkId(1, 'blocks', 2)
      await repo.delete(linkId)

      // Falls back to comment deletion
      expect(octokit.rest.issues.update).toHaveBeenCalled()
    })

    it('tC-45: findByIssueId merges native + comment links (deduplication)', async () => {
      const octokit = createMockOctokitWithRequest()
      const repo = new GitHubIssueLinkRepository(octokit as any, TEST_CONFIG)

      // Issue has both a comment-based blocks link and native API returns same pair
      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body), makeGhIssue(2, null)],
        headers: {},
      })

      // Native strategies return same link for issue #1
      octokit.request
        .mockResolvedValueOnce({ data: [{ number: 2 }] }) // dep: blocked_by for issue#1
        .mockResolvedValueOnce({ data: [] }) // dep: blocking for issue#1
        .mockResolvedValueOnce({ data: [] }) // sub: sub_issues for issue#1
        .mockResolvedValueOnce({ data: null }) // sub: parent for issue#1
        .mockResolvedValueOnce({ data: [] }) // dep: blocked_by for issue#2
        .mockResolvedValueOnce({ data: [] }) // dep: blocking for issue#2
        .mockResolvedValueOnce({ data: [] }) // sub: sub_issues for issue#2
        .mockResolvedValueOnce({ data: null }) // sub: parent for issue#2

      const result = await repo.findByIssueId(makeIssueId(1))

      // The blocks link from comment and native should be deduped (same deterministic ID)
      const blocksLinks = result.filter(l => l.type === 'blocks')
      const uniqueIds = new Set(blocksLinks.map(l => l.id))
      expect(uniqueIds.size).toBe(blocksLinks.length)
    })

    it('tC-46: findBySourceAndTargetAndType checks native API first for blocks', async () => {
      const octokit = createMockOctokitWithRequest()
      const repo = new GitHubIssueLinkRepository(octokit as any, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      // resolveIssueGlobalId
      octokit.rest.issues.get.mockResolvedValue({ data: { ...makeGhIssue(1, null), id: 111 } })

      // Native API: blocking endpoint returns the forward match (#1 blocks #2)
      octokit.request
        .mockResolvedValueOnce({ data: [] }) // blocked_by (empty)
        .mockResolvedValueOnce({ data: [{ number: 2 }] }) // blocking (match)





      const result = await repo.findBySourceAndTargetAndType(makeIssueId(1), makeIssueId(2), 'blocks')

      expect(result).not.toBeNull()
      expect(result!.type).toBe('blocks')
      // Should NOT have fetched the issue body since native API returned the link
      // (issues.get is called for global ID resolution, but not for body fetching in this path)
    })

    it('tC-47: findBySourceAndTargetAndType falls through to comments when native fails', async () => {
      const octokit = createMockOctokitWithRequest()
      const repo = new GitHubIssueLinkRepository(octokit as any, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      // Native request fails
      octokit.request.mockRejectedValue({ response: { status: 500 } })

      // Comment fallback: body has the link
      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.get.mockResolvedValue({ data: makeGhIssue(1, body) })

      const result = await repo.findBySourceAndTargetAndType(makeIssueId(1), makeIssueId(2), 'blocks')

      expect(result).not.toBeNull()
      expect(result!.type).toBe('blocks')
    })

    it('tC-48: deleteByIssueId cleans up native links via all strategies', async () => {
      const octokit = createMockOctokitWithRequest()
      const repo = new GitHubIssueLinkRepository(octokit as any, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)

      // resolveIssueGlobalId
      octokit.rest.issues.get.mockResolvedValue({ data: { ...makeGhIssue(1, null), id: 111 } })

      // allStrategies returns native links for issue #1
      octokit.request
        // dep.findLinksByIssue: blocked_by returns link, blocking returns empty
        .mockResolvedValueOnce({ data: [{ number: 3 }] })
        .mockResolvedValueOnce({ data: [] })
        // sub.findLinksByIssue: sub_issues returns link, parent returns null
        .mockResolvedValueOnce({ data: [{ number: 4 }] })
        .mockResolvedValueOnce({ data: null })
        // duplicates comment strategy findLinksByIssue
        .mockResolvedValueOnce({ data: makeGhIssue(1, null) })
        // relates-to comment strategy findLinksByIssue
        .mockResolvedValueOnce({ data: makeGhIssue(1, null) })
        // dep.deleteLink for #3
        .mockResolvedValueOnce({ data: {} })
        // sub.deleteLink for #4
        .mockResolvedValueOnce({ data: {} })

      // No outgoing comment links
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, null)],
        headers: {},
      })

      await repo.deleteByIssueId(makeIssueId(1))

      // request should have been called for DELETE operations
      const deleteCalls = octokit.request.mock.calls.filter(
        (c: any) => typeof c[0] === 'string' && c[0].includes('DELETE'),
      )
      expect(deleteCalls.length).toBeGreaterThanOrEqual(1)
    })

    it('tC-49: resolveIssueGlobalId caches result', async () => {
      const octokit = createMockOctokitWithRequest()
      const repo = new GitHubIssueLinkRepository(octokit as any, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)
      repo.populateCache(makeIssueId(3), 3)

      // resolveIssueGlobalId returns 111 for issue 1
      octokit.rest.issues.get.mockResolvedValue({ data: { ...makeGhIssue(1, null), id: 111 } })
      octokit.request.mockResolvedValue({ data: {} })

      // Create two links from issue#1 so resolveIssueGlobalId is called twice for same number
      const link1 = makeIssueLink(1, 2, 'blocks')
      const link2 = makeIssueLink(1, 3, 'blocks')
      await repo.create(link1)
      await repo.create(link2)

      // issues.get for resolveIssueGlobalId should be called only once for number 1
      const getCallsForIssue1 = octokit.rest.issues.get.mock.calls.filter(
        (c: any) => c[0].issue_number === 1,
      )
      expect(getCallsForIssue1).toHaveLength(1)
    })

    it('tC-50: resolveIssueGlobalId maps error on failure', async () => {
      const octokit = createMockOctokitWithRequest()
      const repo = new GitHubIssueLinkRepository(octokit as any, TEST_CONFIG)

      repo.populateCache(makeIssueId(1), 1)
      repo.populateCache(makeIssueId(2), 2)

      // resolveIssueGlobalId fails with 404
      octokit.rest.issues.get.mockRejectedValue({ response: { status: 404 } })

      const link = makeIssueLink(1, 2, 'blocks')

      await expect(repo.create(link)).rejects.toThrow(NotFoundError)
    })
  })

  describe('native link deduplication', () => {
    it('eC-11: native link dedup uses same deterministic ID as comment link', async () => {
      // Both comment-based and native links for the same source/target/type pair
      // should produce the same deterministic ID, enabling dedup via Map
      const commentLinkId = makeLinkId(1, 'blocks', 2)

      // The native link should produce the same ID when buildIssueLinkFromParsed is called
      // with the same source/target/type combination. We verify by checking the repository
      // deduplicates correctly.
      const octokit = createMockOctokitWithRequest()
      const repo = new GitHubIssueLinkRepository(octokit as any, TEST_CONFIG)

      const body = '<!-- meridian:blocks=test-owner/test-repo#2 -->'
      octokit.rest.issues.listForRepo.mockResolvedValue({
        data: [makeGhIssue(1, body), makeGhIssue(2, null)],
        headers: {},
      })

      // Native dep strategy returns same pair: blocked_by=[{number:2}] for issue#1
      octokit.request
        // issue#1 dep: blocked_by returns empty (native returns in "blocking" direction)
        .mockResolvedValueOnce({ data: [] }) // blocked_by for #1
        .mockResolvedValueOnce({ data: [{ number: 2 }] }) // blocking for #1 -> blocks link from #1 to #2
        .mockResolvedValueOnce({ data: [] }) // sub_issues for #1
        .mockResolvedValueOnce({ data: null }) // parent for #1
        .mockResolvedValueOnce({ data: [] }) // blocked_by for #2
        .mockResolvedValueOnce({ data: [] }) // blocking for #2
        .mockResolvedValueOnce({ data: [] }) // sub_issues for #2
        .mockResolvedValueOnce({ data: null }) // parent for #2

      const result = await repo.findByIssueId(makeIssueId(1))

      const blocksLinks = result.filter(l => l.type === 'blocks' && l.targetIssueId === makeIssueId(2))
      // Should be exactly 1 link (deduped)
      expect(blocksLinks).toHaveLength(1)
      expect(blocksLinks[0]!.id).toBe(commentLinkId)
    })
  })
})
