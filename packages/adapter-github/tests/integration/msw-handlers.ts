import type { GitHubMilestoneResponse } from '../../src/mappers/github-types.js'

import type { GitHubIssueResponse } from '../../src/mappers/issue-mapper.js'
import { http, HttpResponse } from 'msw'

import {
  GITHUB_ISSUE_CLOSED,
  GITHUB_ISSUE_OPEN,
} from '../fixtures/github-responses.js'

export const MILESTONE_OPEN: GitHubMilestoneResponse = {
  id: 200,
  number: 3,
  title: 'v1.0 Release',
  description: 'First stable release',
  state: 'open',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-02-01T00:00:00Z',
  html_url: 'https://github.com/test-owner/test-repo/milestone/3',
  open_issues: 5,
  closed_issues: 10,
}

export const MILESTONE_CLOSED: GitHubMilestoneResponse = {
  id: 201,
  number: 4,
  title: 'v0.9 Beta',
  description: 'Beta release',
  state: 'closed',
  created_at: '2024-06-01T00:00:00Z',
  updated_at: '2024-12-01T00:00:00Z',
  html_url: 'https://github.com/test-owner/test-repo/milestone/4',
  open_issues: 0,
  closed_issues: 8,
}

/**
 * Default MSW handlers for GitHub REST API endpoints.
 * These provide sensible defaults; individual tests override via server.use().
 */
export const defaultHandlers = [
  // Issues
  http.get('https://api.github.com/repos/:owner/:repo/issues', () => {
    return HttpResponse.json([GITHUB_ISSUE_OPEN, GITHUB_ISSUE_CLOSED])
  }),

  http.get('https://api.github.com/repos/:owner/:repo/issues/:number', () => {
    return HttpResponse.json(GITHUB_ISSUE_OPEN)
  }),

  http.post('https://api.github.com/repos/:owner/:repo/issues', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const response: GitHubIssueResponse = {
      ...GITHUB_ISSUE_OPEN,
      title: (body.title as string) ?? GITHUB_ISSUE_OPEN.title,
      body: (body.body as string) ?? GITHUB_ISSUE_OPEN.body,
      labels: (body.labels as Array<string>) ?? GITHUB_ISSUE_OPEN.labels,
    }
    return HttpResponse.json(response, { status: 201 })
  }),

  http.patch('https://api.github.com/repos/:owner/:repo/issues/:number', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const response: GitHubIssueResponse = {
      ...GITHUB_ISSUE_OPEN,
      ...body as Partial<GitHubIssueResponse>,
    }
    return HttpResponse.json(response)
  }),

  // Search
  http.get('https://api.github.com/search/issues', () => {
    return HttpResponse.json({
      total_count: 1,
      incomplete_results: false,
      items: [GITHUB_ISSUE_OPEN],
    })
  }),

  // Milestones
  http.get('https://api.github.com/repos/:owner/:repo/milestones', () => {
    return HttpResponse.json([MILESTONE_OPEN, MILESTONE_CLOSED])
  }),

  http.get('https://api.github.com/repos/:owner/:repo/milestones/:number', () => {
    return HttpResponse.json(MILESTONE_OPEN)
  }),

  http.post('https://api.github.com/repos/:owner/:repo/milestones', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      {
        ...MILESTONE_OPEN,
        title: (body.title as string) ?? MILESTONE_OPEN.title,
        description: (body.description as string) ?? MILESTONE_OPEN.description,
      },
      { status: 201 },
    )
  }),

  http.patch('https://api.github.com/repos/:owner/:repo/milestones/:number', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      ...MILESTONE_OPEN,
      ...body as Partial<GitHubMilestoneResponse>,
    })
  }),

  http.delete('https://api.github.com/repos/:owner/:repo/milestones/:number', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
