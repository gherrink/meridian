import type { GitHubIssueResponse } from '../../src/mappers/issue-mapper.js'

export const GITHUB_ISSUE_OPEN: GitHubIssueResponse = {
  number: 42,
  title: 'Fix login button',
  body: 'The login button does not respond on mobile devices',
  state: 'open',
  labels: [
    { id: 1001, name: 'bug', color: 'fc2929' },
    { id: 1002, name: 'priority:high', color: 'ff0000' },
  ],
  assignees: [
    { login: 'octocat', id: 1 },
  ],
  milestone: { title: 'v1.0', number: 1 },
  html_url: 'https://github.com/test-owner/test-repo/issues/42',
  reactions: { total_count: 5 },
  locked: false,
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-15T14:30:00Z',
}

export const GITHUB_ISSUE_CLOSED: GitHubIssueResponse = {
  number: 13,
  title: 'Remove deprecated API endpoint',
  body: 'The /v1/users endpoint should be removed',
  state: 'closed',
  labels: [
    { id: 1003, name: 'cleanup', color: '0075ca' },
  ],
  assignees: [],
  milestone: null,
  html_url: 'https://github.com/test-owner/test-repo/issues/13',
  reactions: { total_count: 0 },
  locked: false,
  created_at: '2025-05-01T08:00:00Z',
  updated_at: '2025-05-20T16:00:00Z',
}

export const GITHUB_ISSUE_IN_PROGRESS: GitHubIssueResponse = {
  number: 99,
  title: 'Implement dark mode',
  body: 'Add dark mode theme support',
  state: 'open',
  labels: [
    { id: 1004, name: 'enhancement', color: 'a2eeef' },
    { id: 1005, name: 'state:in-progress', color: 'fbca04' },
    { id: 1006, name: 'priority:urgent', color: 'b60205' },
  ],
  assignees: [
    { login: 'devuser', id: 2 },
  ],
  milestone: { title: 'v2.0', number: 2 },
  html_url: 'https://github.com/test-owner/test-repo/issues/99',
  reactions: { total_count: 12 },
  locked: true,
  created_at: '2025-07-01T09:00:00Z',
  updated_at: '2025-07-10T11:00:00Z',
}

export const GITHUB_ISSUE_MINIMAL: GitHubIssueResponse = {
  number: 1,
  title: 'First issue',
  body: null,
  state: 'open',
  labels: [],
  assignees: null,
  milestone: null,
  html_url: 'https://github.com/test-owner/test-repo/issues/1',
  reactions: null,
  locked: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

export const GITHUB_ISSUE_WITH_STRING_LABELS: GitHubIssueResponse = {
  number: 7,
  title: 'String labels issue',
  body: 'Issue with string-typed labels',
  state: 'open',
  labels: ['bug', 'priority:low'],
  assignees: [],
  milestone: null,
  html_url: 'https://github.com/test-owner/test-repo/issues/7',
  reactions: { total_count: 0 },
  locked: false,
  created_at: '2025-03-01T00:00:00Z',
  updated_at: '2025-03-01T00:00:00Z',
}
