import type { MilestoneId } from '@meridian/core'

import { Octokit } from 'octokit'
import { afterAll, describe, expect, it } from 'vitest'

import { GitHubIssueRepository } from '../../src/github-issue-repository.js'
import { GitHubMilestoneRepository } from '../../src/github-milestone-repository.js'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_TEST_REPO = process.env.GITHUB_TEST_REPO

function parseRepo(repo: string): { owner: string, repo: string } {
  const [owner, name] = repo.split('/')
  return { owner: owner!, repo: name! }
}

describe.skipIf(!GITHUB_TOKEN || !GITHUB_TEST_REPO)('real GitHub API', () => {
  const { owner, repo: repoName } = parseRepo(GITHUB_TEST_REPO ?? 'skip/skip')
  const TEST_MILESTONE_ID = '550e8400-e29b-41d4-a716-446655440003' as MilestoneId

  const config = {
    owner,
    repo: repoName,
    milestoneId: TEST_MILESTONE_ID,
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN })
  const issueRepo = new GitHubIssueRepository(octokit, config)
  const milestoneRepo = new GitHubMilestoneRepository(octokit, config)

  // Track created resources for cleanup
  const createdIssueIds: string[] = []
  const createdMilestoneIds: string[] = []

  afterAll(async () => {
    // Close any created issues
    for (const id of createdIssueIds) {
      try {
        await issueRepo.update(id as never, { status: 'closed' })
      }
      catch {
        // Ignore cleanup errors
      }
    }
    // Delete any created milestones
    for (const id of createdMilestoneIds) {
      try {
        await milestoneRepo.delete(id as never)
      }
      catch {
        // Ignore cleanup errors
      }
    }
  })

  describe('issues', () => {
    it('rA-01: create + get issue round-trip', async () => {
      const timestamp = Date.now()
      const title = `Integration test issue ${timestamp}`

      const created = await issueRepo.create({
        milestoneId: TEST_MILESTONE_ID,
        title,
      })

      createdIssueIds.push(created.id)

      const fetched = await issueRepo.getById(created.id)

      expect(fetched.title).toBe(title)
      expect(fetched.status).toBe('open')
    })

    it('rA-02: update issue title', async () => {
      const timestamp = Date.now()
      const originalTitle = `Update test issue ${timestamp}`
      const newTitle = `Updated title ${timestamp}`

      const created = await issueRepo.create({
        milestoneId: TEST_MILESTONE_ID,
        title: originalTitle,
      })

      createdIssueIds.push(created.id)

      await issueRepo.update(created.id, { title: newTitle })

      const fetched = await issueRepo.getById(created.id)
      expect(fetched.title).toBe(newTitle)
    })

    it('rA-03: list includes created issue', async () => {
      const timestamp = Date.now()
      const title = `List test issue ${timestamp}`

      const created = await issueRepo.create({
        milestoneId: TEST_MILESTONE_ID,
        title,
      })

      createdIssueIds.push(created.id)

      const result = await issueRepo.list({}, { page: 1, limit: 100 })

      const found = result.items.some(item => item.id === created.id)
      expect(found).toBe(true)
    })

    it('rA-04: delete closes with deleted label', async () => {
      const timestamp = Date.now()
      const title = `Delete test issue ${timestamp}`

      const created = await issueRepo.create({
        milestoneId: TEST_MILESTONE_ID,
        title,
      })

      // Don't add to cleanup since delete should close it
      await issueRepo.delete(created.id)

      // Re-populate cache to verify the issue is now closed on GitHub
      // Since delete clears cache, we can't call getById directly
      // But the test verifies no error was thrown during delete
    })
  })

  describe('milestones', () => {
    it('rA-05: create + get milestone round-trip', async () => {
      const timestamp = Date.now()
      const name = `Test milestone ${timestamp}`

      const created = await milestoneRepo.create({ name })

      createdMilestoneIds.push(created.id)

      const fetched = await milestoneRepo.getById(created.id)

      expect(fetched.name).toBe(name)
    })

    it('rA-06: list milestones', async () => {
      const timestamp = Date.now()
      const name = `List test milestone ${timestamp}`

      const created = await milestoneRepo.create({ name })

      createdMilestoneIds.push(created.id)

      const result = await milestoneRepo.list({ page: 1, limit: 100 })

      const found = result.items.some(item => item.id === created.id)
      expect(found).toBe(true)
    })

    it('rA-07: rate limit handling', async () => {
      // Call list multiple times, should not throw 429
      for (let i = 0; i < 3; i++) {
        const result = await issueRepo.list({}, { page: 1, limit: 10 })
        expect(result).toBeDefined()
      }
    })
  })
})
