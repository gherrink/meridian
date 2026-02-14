import type { Comment } from '../../src/model/comment.js'
import type { Epic } from '../../src/model/epic.js'
import type { Issue } from '../../src/model/issue.js'
import type { Project } from '../../src/model/project.js'
import type { Tag } from '../../src/model/tag.js'
import type { User } from '../../src/model/user.js'
import type { CommentId, EpicId, IssueId, ProjectId, TagId, UserId } from '../../src/model/value-objects.js'

export const TEST_ISSUE_ID = '550e8400-e29b-41d4-a716-446655440001' as IssueId
export const TEST_EPIC_ID = '550e8400-e29b-41d4-a716-446655440002' as EpicId
export const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440003' as ProjectId
export const TEST_COMMENT_ID = '550e8400-e29b-41d4-a716-446655440004' as CommentId
export const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440005' as UserId
export const TEST_TAG_ID = '550e8400-e29b-41d4-a716-446655440006' as TagId

const TEST_DATE = new Date('2025-01-01T00:00:00.000Z')

export function createUserFixture(overrides: Partial<User> = {}): User {
  return {
    id: TEST_USER_ID,
    name: 'Test User',
    email: null,
    avatarUrl: null,
    ...overrides,
  }
}

export function createTagFixture(overrides: Partial<Tag> = {}): Tag {
  return {
    id: TEST_TAG_ID,
    name: 'bug',
    color: null,
    ...overrides,
  }
}

export function createProjectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: TEST_PROJECT_ID,
    name: 'Test Project',
    description: '',
    metadata: {},
    createdAt: TEST_DATE,
    updatedAt: TEST_DATE,
    ...overrides,
  }
}

export function createIssueFixture(overrides: Partial<Issue> = {}): Issue {
  return {
    id: TEST_ISSUE_ID,
    projectId: TEST_PROJECT_ID,
    title: 'Test Issue',
    description: '',
    status: 'open',
    priority: 'normal',
    assigneeIds: [],
    tags: [],
    dueDate: null,
    metadata: {},
    createdAt: TEST_DATE,
    updatedAt: TEST_DATE,
    ...overrides,
  }
}

export function createEpicFixture(overrides: Partial<Epic> = {}): Epic {
  return {
    id: TEST_EPIC_ID,
    projectId: TEST_PROJECT_ID,
    title: 'Test Epic',
    description: '',
    issueIds: [],
    status: 'open',
    metadata: {},
    createdAt: TEST_DATE,
    updatedAt: TEST_DATE,
    ...overrides,
  }
}

export function createCommentFixture(overrides: Partial<Comment> = {}): Comment {
  return {
    id: TEST_COMMENT_ID,
    body: 'Test comment body',
    authorId: TEST_USER_ID,
    issueId: TEST_ISSUE_ID,
    createdAt: TEST_DATE,
    updatedAt: TEST_DATE,
    ...overrides,
  }
}
