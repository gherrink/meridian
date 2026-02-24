import type { Issue, Milestone } from '@meridian/core'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpServerConfig } from '../src/types.js'

import {
  AssignIssueUseCase,
  CreateCommentUseCase,
  CreateIssueLinkUseCase,
  CreateIssueUseCase,
  CreateMilestoneUseCase,
  DEFAULT_RELATIONSHIP_TYPES,
  DeleteCommentUseCase,
  DeleteIssueLinkUseCase,
  DeleteIssueUseCase,
  DeleteMilestoneUseCase,
  GetCommentsByIssueUseCase,
  GetMilestoneOverviewUseCase,
  InMemoryCommentRepository,
  InMemoryIssueLinkRepository,
  InMemoryIssueRepository,
  InMemoryMilestoneRepository,
  InMemoryUserRepository,
  ListIssueLinksUseCase,
  ListIssuesUseCase,
  ListMilestonesUseCase,
  ReparentIssueUseCase,
  UpdateCommentUseCase,
  UpdateIssueUseCase,
  UpdateMilestoneUseCase,
  UpdateStateUseCase,
} from '@meridian/core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMcpServer } from '../src/server.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MILESTONE_ID = 'a0000000-0000-0000-0000-000000000001' as string
const ISSUE_ID_1 = 'b0000000-0000-0000-0000-000000000001' as string
const ISSUE_ID_2 = 'b0000000-0000-0000-0000-000000000002' as string
const ISSUE_ID_3 = 'b0000000-0000-0000-0000-000000000003' as string
const USER_ID = 'c0000000-0000-0000-0000-000000000001' as string
const NONEXISTENT_ID = 'f0000000-0000-0000-0000-000000000099' as string

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseTextContent(result: CallToolResult) {
  const text = (result.content as Array<{ type: string, text: string }>)[0]!.text
  return JSON.parse(text)
}

function createSeedMilestone(): Milestone {
  const now = new Date()
  return {
    id: MILESTONE_ID,
    name: 'Alpha',
    description: '',
    status: 'open',
    dueDate: null,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  } as Milestone
}

function createSeedIssues(): Issue[] {
  const now = new Date()
  return [
    {
      id: ISSUE_ID_1,
      milestoneId: MILESTONE_ID,
      title: 'Issue One',
      description: 'First issue description',
      state: 'open',
      status: 'backlog',
      priority: 'normal',
      parentId: null,
      assigneeIds: [USER_ID],
      tags: [],
      dueDate: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    } as Issue,
    {
      id: ISSUE_ID_2,
      milestoneId: MILESTONE_ID,
      title: 'Issue Two',
      description: 'Second issue description',
      state: 'open',
      status: 'backlog',
      priority: 'high',
      parentId: null,
      assigneeIds: [USER_ID],
      tags: [],
      dueDate: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    } as Issue,
    {
      id: ISSUE_ID_3,
      milestoneId: MILESTONE_ID,
      title: 'Issue Three',
      description: 'Third issue description',
      state: 'in_progress',
      status: 'in_review',
      priority: 'urgent',
      parentId: null,
      assigneeIds: [USER_ID],
      tags: [],
      dueDate: null,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    } as Issue,
  ]
}

async function createIntegrationServer(config?: McpServerConfig) {
  const issueRepo = new InMemoryIssueRepository()
  const milestoneRepo = new InMemoryMilestoneRepository()
  const commentRepo = new InMemoryCommentRepository()
  const userRepo = new InMemoryUserRepository()
  const issueLinkRepo = new InMemoryIssueLinkRepository()

  const auditLogger = { log: vi.fn() }

  // Seed data
  milestoneRepo.seed([createSeedMilestone()])
  issueRepo.seed(createSeedIssues())

  // Wire use cases
  const createIssue = new CreateIssueUseCase(issueRepo, auditLogger)
  const createMilestone = new CreateMilestoneUseCase(milestoneRepo, auditLogger)
  const listIssues = new ListIssuesUseCase(issueRepo)
  const updateIssue = new UpdateIssueUseCase(issueRepo, auditLogger)
  const updateState = new UpdateStateUseCase(issueRepo, auditLogger)
  const getMilestoneOverview = new GetMilestoneOverviewUseCase(milestoneRepo, issueRepo)
  const assignIssue = new AssignIssueUseCase(issueRepo, userRepo, auditLogger)
  const listMilestones = new ListMilestonesUseCase(milestoneRepo)
  const updateMilestone = new UpdateMilestoneUseCase(milestoneRepo, auditLogger)
  const deleteMilestone = new DeleteMilestoneUseCase(milestoneRepo, auditLogger)
  const deleteIssue = new DeleteIssueUseCase(issueRepo, auditLogger)
  const reparentIssue = new ReparentIssueUseCase(issueRepo, auditLogger)
  const createComment = new CreateCommentUseCase(commentRepo, auditLogger)
  const updateComment = new UpdateCommentUseCase(commentRepo, auditLogger)
  const deleteComment = new DeleteCommentUseCase(commentRepo, auditLogger)
  const getCommentsByIssue = new GetCommentsByIssueUseCase(commentRepo)
  const relationshipTypes = [...DEFAULT_RELATIONSHIP_TYPES]
  const createIssueLink = new CreateIssueLinkUseCase(issueLinkRepo, issueRepo, relationshipTypes)
  const deleteIssueLink = new DeleteIssueLinkUseCase(issueLinkRepo)
  const listIssueLinks = new ListIssueLinksUseCase(issueLinkRepo, relationshipTypes)

  const deps = {
    createIssue,
    createMilestone,
    listIssues,
    updateIssue,
    updateState,
    assignIssue,
    getMilestoneOverview,
    listMilestones,
    updateMilestone,
    deleteMilestone,
    deleteIssue,
    reparentIssue,
    createComment,
    updateComment,
    deleteComment,
    getCommentsByIssue,
    createIssueLink,
    deleteIssueLink,
    listIssueLinks,
    issueRepository: issueRepo,
  }

  const server = createMcpServer(deps, config)

  const client = new Client({ name: 'integration-test', version: '1.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

  await server.connect(serverTransport)
  await client.connect(clientTransport)

  return {
    server,
    client,
    repos: { issues: issueRepo, milestones: milestoneRepo, comments: commentRepo },
    cleanup: async () => {
      await client.close()
      await server.close()
    },
  }
}

// ---------------------------------------------------------------------------
// Tool Discovery
// ---------------------------------------------------------------------------
describe('tool discovery', () => {
  let client: Awaited<ReturnType<typeof createIntegrationServer>>['client']
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const ctx = await createIntegrationServer()
    client = ctx.client
    cleanup = ctx.cleanup
  })

  afterEach(async () => {
    await cleanup()
  })

  it('tC-01: list all 24 tools (no filter)', async () => {
    const result = await client.listTools()

    expect(result.tools).toHaveLength(24)
    const names = result.tools.map(t => t.name)
    // health_check
    expect(names).toContain('health_check')
    // shared tools
    expect(names).toContain('create_issue')
    expect(names).toContain('search_issues')
    expect(names).toContain('get_issue')
    expect(names).toContain('list_milestones')
    // PM tools
    expect(names).toContain('create_epic')
    expect(names).toContain('create_milestone')
    expect(names).toContain('view_roadmap')
    expect(names).toContain('assign_priority')
    expect(names).toContain('list_pm_milestones')
    expect(names).toContain('milestone_overview')
    expect(names).toContain('reparent_issue')
    expect(names).toContain('delete_issue')
    expect(names).toContain('link_issues')
    expect(names).toContain('unlink_issues')
    expect(names).toContain('list_issue_links')
    // Dev tools
    expect(names).toContain('pick_next_task')
    expect(names).toContain('update_status')
    expect(names).toContain('view_issue_detail')
    expect(names).toContain('list_my_issues')
    expect(names).toContain('add_comment')
    expect(names).toContain('update_comment')
    expect(names).toContain('delete_comment')
    expect(names).toContain('list_issue_comments')
  })

  it('tC-02: every tool has non-empty description', async () => {
    const result = await client.listTools()

    for (const tool of result.tools) {
      expect(tool.description).toBeDefined()
      expect(tool.description!.length).toBeGreaterThan(0)
    }
  })

  it('tC-03: every tool has inputSchema defined', async () => {
    const result = await client.listTools()

    for (const tool of result.tools) {
      expect(tool.inputSchema).toBeDefined()
      expect(typeof tool.inputSchema).toBe('object')
    }
  })
})

// ---------------------------------------------------------------------------
// Role Filtering
// ---------------------------------------------------------------------------
describe('role filtering', () => {
  const PM_TOOL_NAMES = ['create_epic', 'create_milestone', 'view_roadmap', 'assign_priority', 'list_pm_milestones', 'milestone_overview', 'reparent_issue', 'delete_issue', 'link_issues', 'unlink_issues', 'list_issue_links']
  const DEV_TOOL_NAMES = ['pick_next_task', 'update_status', 'view_issue_detail', 'list_my_issues', 'add_comment', 'update_comment', 'delete_comment', 'list_issue_comments']
  const SHARED_TOOL_NAMES = ['create_issue', 'search_issues', 'get_issue', 'list_milestones']

  it('tC-04: PM role: only PM + shared + health visible', async () => {
    const { client, cleanup } = await createIntegrationServer({ includeTags: new Set(['pm']) })

    const result = await client.listTools()
    const names = result.tools.map(t => t.name)

    expect(result.tools).toHaveLength(16)
    for (const name of PM_TOOL_NAMES) {
      expect(names).toContain(name)
    }
    for (const name of SHARED_TOOL_NAMES) {
      expect(names).toContain(name)
    }
    expect(names).toContain('health_check')
    for (const name of DEV_TOOL_NAMES) {
      expect(names).not.toContain(name)
    }

    await cleanup()
  })

  it('tC-05: Dev role: only Dev + shared + health visible', async () => {
    const { client, cleanup } = await createIntegrationServer({ includeTags: new Set(['dev']) })

    const result = await client.listTools()
    const names = result.tools.map(t => t.name)

    expect(result.tools).toHaveLength(13)
    for (const name of DEV_TOOL_NAMES) {
      expect(names).toContain(name)
    }
    for (const name of SHARED_TOOL_NAMES) {
      expect(names).toContain(name)
    }
    expect(names).toContain('health_check')
    for (const name of PM_TOOL_NAMES) {
      expect(names).not.toContain(name)
    }

    await cleanup()
  })

  it('tC-06: All role (no filter): all 24 tools visible', async () => {
    const { client, cleanup } = await createIntegrationServer()

    const result = await client.listTools()

    expect(result.tools).toHaveLength(24)

    await cleanup()
  })

  it('tC-07: exclude shared: hides shared + health_check', async () => {
    const { client, cleanup } = await createIntegrationServer({ excludeTags: new Set(['shared']) })

    const result = await client.listTools()
    const names = result.tools.map(t => t.name)

    expect(names).not.toContain('health_check')
    expect(names).not.toContain('create_issue')
    expect(names).not.toContain('search_issues')
    expect(names).not.toContain('get_issue')
    expect(names).not.toContain('list_milestones')
    // PM and Dev tools should still be present
    for (const name of PM_TOOL_NAMES) {
      expect(names).toContain(name)
    }
    for (const name of DEV_TOOL_NAMES) {
      expect(names).toContain(name)
    }

    await cleanup()
  })

  it('tC-08: include pm, exclude shared', async () => {
    const { client, cleanup } = await createIntegrationServer({
      includeTags: new Set(['pm']),
      excludeTags: new Set(['shared']),
    })

    const result = await client.listTools()
    const names = result.tools.map(t => t.name)

    for (const name of PM_TOOL_NAMES) {
      expect(names).toContain(name)
    }
    for (const name of SHARED_TOOL_NAMES) {
      expect(names).not.toContain(name)
    }
    expect(names).not.toContain('health_check')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// Shared Tools Execution
// ---------------------------------------------------------------------------
describe('shared tools execution', () => {
  let client: Awaited<ReturnType<typeof createIntegrationServer>>['client']
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const ctx = await createIntegrationServer()
    client = ctx.client
    cleanup = ctx.cleanup
  })

  afterEach(async () => {
    await cleanup()
  })

  it('tC-09: health_check returns ok', async () => {
    const result = await client.callTool({ name: 'health_check', arguments: {} }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.status).toBe('ok')
    expect(parsed.version).toBeDefined()
    expect(parsed.timestamp).toBeDefined()
  })

  it('tC-10: get_issue returns seeded issue', async () => {
    const result = await client.callTool({ name: 'get_issue', arguments: { issueId: ISSUE_ID_1 } }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.id).toBe(ISSUE_ID_1)
    expect(parsed.title).toBeDefined()
    expect(parsed.state).toBeDefined()
    expect(parsed.status).toBeDefined()
    expect(parsed.priority).toBeDefined()
  })

  it('tC-11: get_issue not found', async () => {
    const result = await client.callTool({ name: 'get_issue', arguments: { issueId: NONEXISTENT_ID } }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')
  })

  it('tC-12: search_issues returns matching results', async () => {
    const result = await client.callTool({ name: 'search_issues', arguments: { state: 'open' } }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items).toHaveLength(2)
  })

  it('tC-13: search_issues with text search', async () => {
    const result = await client.callTool({ name: 'search_issues', arguments: { search: 'Issue One' } }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items.length).toBeGreaterThanOrEqual(1)
    const ids = parsed.items.map((i: { id: string }) => i.id)
    expect(ids).toContain(ISSUE_ID_1)
  })

  it('tC-14: list_milestones returns seeded milestone', async () => {
    const result = await client.callTool({ name: 'list_milestones', arguments: {} }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items).toHaveLength(1)
    expect(parsed.items[0].name).toBe('Alpha')
  })
})

// ---------------------------------------------------------------------------
// PM Tools Execution
// ---------------------------------------------------------------------------
describe('pM tools execution', () => {
  let client: Awaited<ReturnType<typeof createIntegrationServer>>['client']
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const ctx = await createIntegrationServer()
    client = ctx.client
    cleanup = ctx.cleanup
  })

  afterEach(async () => {
    await cleanup()
  })

  it('tC-15: create_epic creates new issue', async () => {
    const result = await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: MILESTONE_ID, title: 'New Epic' },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.id).toBeDefined()
    expect(typeof parsed.id).toBe('string')
    expect(parsed.title).toBe('New Epic')
    expect(parsed.metadata.type).toBe('epic')
  })

  it('tC-16: create_epic with description', async () => {
    const result = await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: MILESTONE_ID, title: 'E2', description: 'Desc' },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.description).toBe('Desc')
  })

  it('tC-17: assign_priority updates issue', async () => {
    const result = await client.callTool({
      name: 'assign_priority',
      arguments: { issueId: ISSUE_ID_1, priority: 'urgent' },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.priority).toBe('urgent')

    // Verify persistence via get_issue
    const getResult = await client.callTool({
      name: 'get_issue',
      arguments: { issueId: ISSUE_ID_1 },
    }) as CallToolResult
    const getParsed = parseTextContent(getResult)
    expect(getParsed.priority).toBe('urgent')
  })

  it('tC-18: milestone_overview returns breakdown', async () => {
    const result = await client.callTool({
      name: 'milestone_overview',
      arguments: { milestoneId: MILESTONE_ID },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.totalIssues).toBe(3)
    expect(parsed.stateBreakdown).toHaveProperty('open')
    expect(parsed.stateBreakdown).toHaveProperty('in_progress')
    expect(parsed.stateBreakdown).toHaveProperty('done')
  })

  it('tC-19: view_roadmap returns summary', async () => {
    const result = await client.callTool({
      name: 'view_roadmap',
      arguments: { milestoneId: MILESTONE_ID },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.milestoneName).toBe('Alpha')
    expect(parsed.totalIssues).toBe(3)
    expect(typeof parsed.completionPercentage).toBe('number')
  })

  it('tC-20: list_pm_milestones returns milestones', async () => {
    const result = await client.callTool({
      name: 'list_pm_milestones',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items.length).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// Dev Tools Execution
// ---------------------------------------------------------------------------
describe('dev tools execution', () => {
  let client: Awaited<ReturnType<typeof createIntegrationServer>>['client']
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const ctx = await createIntegrationServer()
    client = ctx.client
    cleanup = ctx.cleanup
  })

  afterEach(async () => {
    await cleanup()
  })

  it('tC-21: update_status changes state', async () => {
    const result = await client.callTool({
      name: 'update_status',
      arguments: { issueId: ISSUE_ID_1, state: 'in_progress' },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.state).toBe('in_progress')
  })

  it('tC-22: view_issue_detail returns issue + comments', async () => {
    // First add a comment
    await client.callTool({
      name: 'add_comment',
      arguments: { issueId: ISSUE_ID_1, body: 'A test comment' },
    })

    const result = await client.callTool({
      name: 'view_issue_detail',
      arguments: { issueId: ISSUE_ID_1 },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.issue.id).toBe(ISSUE_ID_1)
    expect(parsed.comments).toBeInstanceOf(Array)
    expect(parsed.comments.length).toBeGreaterThanOrEqual(1)
  })

  it('tC-23: add_comment creates comment', async () => {
    const result = await client.callTool({
      name: 'add_comment',
      arguments: { issueId: ISSUE_ID_1, body: 'Test note' },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.id).toBeDefined()
    expect(parsed.issueId).toBe(ISSUE_ID_1)
    expect(parsed.createdAt).toBeDefined()
  })

  it('tC-24: list_my_issues returns grouped issues', async () => {
    const result = await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: USER_ID },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.grouped).toBeDefined()
    expect(typeof parsed.grouped).toBe('object')
    expect(parsed.total).toBe(3)
    const keys = Object.keys(parsed.grouped)
    expect(keys).toContain('in_progress')
    expect(keys).toContain('open')
  })

  it('tC-25: list_my_issues state filter', async () => {
    const result = await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: USER_ID, state: 'open' },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    // All items in grouped should be open
    for (const [state, items] of Object.entries(parsed.grouped)) {
      expect(state).toBe('open')
      expect(Array.isArray(items)).toBe(true)
    }
  })

  it('tC-26: pick_next_task returns ranked suggestions', async () => {
    const result = await client.callTool({
      name: 'pick_next_task',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.suggestions).toBeInstanceOf(Array)
    expect(parsed.suggestions.length).toBeGreaterThan(0)
    for (const suggestion of parsed.suggestions) {
      expect(suggestion.rank).toBeDefined()
      expect(suggestion.id).toBeDefined()
      expect(suggestion.title).toBeDefined()
      expect(suggestion.state).toBeDefined()
      expect(suggestion.status).toBeDefined()
      expect(suggestion.priority).toBeDefined()
    }
    expect(parsed.suggestions[0].rank).toBe(1)
  })

  it('tC-27: pick_next_task with limit', async () => {
    const result = await client.callTool({
      name: 'pick_next_task',
      arguments: { limit: 1 },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.suggestions).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
describe('error handling', () => {
  let client: Awaited<ReturnType<typeof createIntegrationServer>>['client']
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const ctx = await createIntegrationServer()
    client = ctx.client
    cleanup = ctx.cleanup
  })

  afterEach(async () => {
    await cleanup()
  })

  it('tC-28: get_issue: invalid UUID format', async () => {
    const result = await client.callTool({
      name: 'get_issue',
      arguments: { issueId: 'not-a-uuid' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
  })

  it('tC-29: get_issue: missing required field', async () => {
    const result = await client.callTool({
      name: 'get_issue',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBe(true)
  })

  it('tC-30: create_epic: empty title rejected', async () => {
    const result = await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: MILESTONE_ID, title: '' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
  })

  it('tC-31: create_epic: invalid milestoneId', async () => {
    const result = await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: 'bad', title: 'X' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
  })

  it('tC-32: update_status: invalid state value', async () => {
    const result = await client.callTool({
      name: 'update_status',
      arguments: { issueId: ISSUE_ID_1, state: 'pending' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
  })

  it('tC-33: assign_priority: invalid priority', async () => {
    const result = await client.callTool({
      name: 'assign_priority',
      arguments: { issueId: ISSUE_ID_1, priority: 'critical' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
  })

  it('tC-34: update_status: nonexistent issue', async () => {
    const result = await client.callTool({
      name: 'update_status',
      arguments: { issueId: NONEXISTENT_ID, state: 'done' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')
  })

  it('tC-35: view_roadmap: nonexistent milestone', async () => {
    const result = await client.callTool({
      name: 'view_roadmap',
      arguments: { milestoneId: NONEXISTENT_ID },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')
  })

  it('tC-36: milestone_overview: nonexistent milestone', async () => {
    const result = await client.callTool({
      name: 'milestone_overview',
      arguments: { milestoneId: NONEXISTENT_ID },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')
  })

  it('tC-37: add_comment: empty body rejected', async () => {
    const result = await client.callTool({
      name: 'add_comment',
      arguments: { issueId: ISSUE_ID_1, body: '' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
  })

  it('tC-38: search_issues: limit exceeds max 100', async () => {
    const result = await client.callTool({
      name: 'search_issues',
      arguments: { limit: 101 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
  })

  it('tC-39: list_my_issues: limit exceeds max 50', async () => {
    const result = await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: USER_ID, limit: 100 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
  })

  it('tC-40: pick_next_task: limit exceeds max 10', async () => {
    const result = await client.callTool({
      name: 'pick_next_task',
      arguments: { limit: 20 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Response Format
// ---------------------------------------------------------------------------
describe('response format', () => {
  let client: Awaited<ReturnType<typeof createIntegrationServer>>['client']
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const ctx = await createIntegrationServer()
    client = ctx.client
    cleanup = ctx.cleanup
  })

  afterEach(async () => {
    await cleanup()
  })

  it('tC-41: success response is JSON text content', async () => {
    const result = await client.callTool({ name: 'health_check', arguments: {} }) as CallToolResult

    expect(result.content).toBeInstanceOf(Array)
    const content = result.content as Array<{ type: string, text: string }>
    expect(content[0]!.type).toBe('text')
    expect(() => JSON.parse(content[0]!.text)).not.toThrow()
  })

  it('tC-42: error response has isError=true + JSON body', async () => {
    const result = await client.callTool({
      name: 'get_issue',
      arguments: { issueId: NONEXISTENT_ID },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const content = result.content as Array<{ type: string, text: string }>
    expect(content[0]!.type).toBe('text')
    const parsed = JSON.parse(content[0]!.text)
    expect(parsed).toHaveProperty('code')
    expect(parsed).toHaveProperty('message')
  })
})

// ---------------------------------------------------------------------------
// Cross-Tool Integration
// ---------------------------------------------------------------------------
describe('cross-tool integration', () => {
  let client: Awaited<ReturnType<typeof createIntegrationServer>>['client']
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const ctx = await createIntegrationServer()
    client = ctx.client
    cleanup = ctx.cleanup
  })

  afterEach(async () => {
    await cleanup()
  })

  it('tC-43: create then retrieve', async () => {
    const createResult = await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: MILESTONE_ID, title: 'Cross Tool Epic' },
    }) as CallToolResult

    expect(createResult.isError).toBeFalsy()
    const created = parseTextContent(createResult)

    const getResult = await client.callTool({
      name: 'get_issue',
      arguments: { issueId: created.id },
    }) as CallToolResult

    expect(getResult.isError).toBeFalsy()
    const retrieved = parseTextContent(getResult)
    expect(retrieved.id).toBe(created.id)
  })

  it('tC-44: update then verify', async () => {
    await client.callTool({
      name: 'assign_priority',
      arguments: { issueId: ISSUE_ID_1, priority: 'urgent' },
    }) as CallToolResult

    const searchResult = await client.callTool({
      name: 'search_issues',
      arguments: { priority: 'urgent' },
    }) as CallToolResult

    expect(searchResult.isError).toBeFalsy()
    const parsed = parseTextContent(searchResult)
    const ids = parsed.items.map((i: { id: string }) => i.id)
    expect(ids).toContain(ISSUE_ID_1)
  })
})
