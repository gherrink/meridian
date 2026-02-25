import type { IssueId, MilestoneId } from '@meridian/core'

import { describe, expect, it } from 'vitest'
import { GitHubNumberCache } from '../github-number-cache.js'
import { generateDeterministicId, ISSUE_ID_NAMESPACE, MILESTONE_ID_NAMESPACE } from '../mappers/deterministic-id.js'

const TEST_CONFIG = {
  owner: 'test-owner',
  repo: 'test-repo',
  milestoneId: '550e8400-e29b-41d4-a716-446655440003' as MilestoneId,
}

function makeIssueId(n: number): IssueId {
  return generateDeterministicId(ISSUE_ID_NAMESPACE, `test-owner/test-repo#${n}`) as IssueId
}

function makeMilestoneId(n: number): MilestoneId {
  return generateDeterministicId(MILESTONE_ID_NAMESPACE, `test-owner/test-repo#${n}`) as MilestoneId
}

describe('gitHubNumberCache', () => {
  describe('issue cache', () => {
    it('nC-01: setIssue/getIssue round-trip', () => {
      const cache = new GitHubNumberCache()
      const id = makeIssueId(1)

      cache.setIssue(id, 42)

      expect(cache.getIssue(id)).toBe(42)
    })

    it('nC-02: getIssue returns undefined for unknown id', () => {
      const cache = new GitHubNumberCache()
      const unknownId = makeIssueId(999)

      expect(cache.getIssue(unknownId)).toBeUndefined()
    })

    it('nC-03: setIssue overwrites previous value', () => {
      const cache = new GitHubNumberCache()
      const id = makeIssueId(1)

      cache.setIssue(id, 1)
      cache.setIssue(id, 2)

      expect(cache.getIssue(id)).toBe(2)
    })

    it('nC-04: deleteIssue removes from cache and marks deleted', () => {
      const cache = new GitHubNumberCache()
      const id = makeIssueId(1)

      cache.setIssue(id, 42)
      cache.deleteIssue(id)

      expect(cache.getIssue(id)).toBeUndefined()
      expect(cache.isIssueDeleted(id)).toBe(true)
    })

    it('nC-05: isIssueDeleted returns false for unknown id', () => {
      const cache = new GitHubNumberCache()
      const unknownId = makeIssueId(999)

      expect(cache.isIssueDeleted(unknownId)).toBe(false)
    })

    it('nC-16: deleteIssue prevents re-caching -- isIssueDeleted remains true after setIssue', () => {
      const cache = new GitHubNumberCache()
      const id = makeIssueId(1)

      cache.deleteIssue(id)
      cache.setIssue(id, 99)

      // Deleted set takes precedence: isIssueDeleted remains true
      expect(cache.isIssueDeleted(id)).toBe(true)
    })

    it('nC-17: multiple issues stored independently', () => {
      const cache = new GitHubNumberCache()
      const id1 = makeIssueId(1)
      const id2 = makeIssueId(2)

      cache.setIssue(id1, 1)
      cache.setIssue(id2, 2)

      expect(cache.getIssue(id1)).toBe(1)
      expect(cache.getIssue(id2)).toBe(2)
    })
  })

  describe('milestone cache', () => {
    it('nC-06: setMilestone/getMilestone round-trip', () => {
      const cache = new GitHubNumberCache()
      const id = makeMilestoneId(1)

      cache.setMilestone(id, 3)

      expect(cache.getMilestone(id)).toBe(3)
    })

    it('nC-07: getMilestone returns undefined for unknown id', () => {
      const cache = new GitHubNumberCache()
      const unknownId = makeMilestoneId(999)

      expect(cache.getMilestone(unknownId)).toBeUndefined()
    })

    it('nC-08: deleteMilestone removes and marks deleted', () => {
      const cache = new GitHubNumberCache()
      const id = makeMilestoneId(1)

      cache.setMilestone(id, 3)
      cache.deleteMilestone(id)

      expect(cache.getMilestone(id)).toBeUndefined()
      expect(cache.isMilestoneDeleted(id)).toBe(true)
    })

    it('nC-09: isMilestoneDeleted returns false for unknown id', () => {
      const cache = new GitHubNumberCache()
      const unknownId = makeMilestoneId(999)

      expect(cache.isMilestoneDeleted(unknownId)).toBe(false)
    })
  })

  describe('issuesBulkLoaded flag', () => {
    it('nC-10: issuesBulkLoaded starts false', () => {
      const cache = new GitHubNumberCache()

      expect(cache.issuesBulkLoaded).toBe(false)
    })

    it('nC-11: markIssuesBulkLoaded sets flag true', () => {
      const cache = new GitHubNumberCache()

      cache.markIssuesBulkLoaded()

      expect(cache.issuesBulkLoaded).toBe(true)
    })

    it('nC-12: resetIssuesBulkLoaded sets flag back to false', () => {
      const cache = new GitHubNumberCache()

      cache.markIssuesBulkLoaded()
      cache.resetIssuesBulkLoaded()

      expect(cache.issuesBulkLoaded).toBe(false)
    })

    it('nC-18: resetIssuesBulkLoaded preserves cached data', () => {
      const cache = new GitHubNumberCache()
      const id = makeIssueId(1)

      cache.setIssue(id, 42)
      cache.markIssuesBulkLoaded()
      cache.resetIssuesBulkLoaded()

      expect(cache.getIssue(id)).toBe(42)
      expect(cache.issuesBulkLoaded).toBe(false)
    })
  })

  describe('milestonesBulkLoaded flag', () => {
    it('nC-13: milestonesBulkLoaded starts false', () => {
      const cache = new GitHubNumberCache()

      expect(cache.milestonesBulkLoaded).toBe(false)
    })

    it('nC-14: markMilestonesBulkLoaded sets flag true', () => {
      const cache = new GitHubNumberCache()

      cache.markMilestonesBulkLoaded()

      expect(cache.milestonesBulkLoaded).toBe(true)
    })

    it('nC-15: resetMilestonesBulkLoaded sets flag back to false', () => {
      const cache = new GitHubNumberCache()

      cache.markMilestonesBulkLoaded()
      cache.resetMilestonesBulkLoaded()

      expect(cache.milestonesBulkLoaded).toBe(false)
    })

    it('nC-19: resetMilestonesBulkLoaded preserves cached data', () => {
      const cache = new GitHubNumberCache()
      const id = makeMilestoneId(1)

      cache.setMilestone(id, 3)
      cache.markMilestonesBulkLoaded()
      cache.resetMilestonesBulkLoaded()

      expect(cache.getMilestone(id)).toBe(3)
      expect(cache.milestonesBulkLoaded).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('eC-01: fresh cache has no entries', () => {
      const cache = new GitHubNumberCache()
      const anyIssueId = makeIssueId(1)
      const anyMilestoneId = makeMilestoneId(1)

      expect(cache.getIssue(anyIssueId)).toBeUndefined()
      expect(cache.getMilestone(anyMilestoneId)).toBeUndefined()
      expect(cache.issuesBulkLoaded).toBe(false)
      expect(cache.milestonesBulkLoaded).toBe(false)
    })

    it('eC-03: concurrent repos populating same cache is idempotent', () => {
      const cache = new GitHubNumberCache()
      const id1 = makeIssueId(1)
      const id2 = makeIssueId(2)

      // Simulate two repos populating the same cache with the same data
      cache.setIssue(id1, 10)
      cache.setIssue(id2, 20)
      cache.setIssue(id1, 10)
      cache.setIssue(id2, 20)

      expect(cache.getIssue(id1)).toBe(10)
      expect(cache.getIssue(id2)).toBe(20)
    })
  })
})
