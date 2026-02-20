import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpServerDependencies } from '../types.js'

import { NotFoundError } from '@meridian/core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it, vi } from 'vitest'

import { ToolTagRegistry } from '../helpers/tool-tag-registry.js'
import { createMcpServer } from '../server.js'
import { registerAddCommentTool } from '../tools/dev/add-comment.js'
import { registerDevTools } from '../tools/dev/index.js'
import { registerListMyIssuesTool } from '../tools/dev/list-my-issues.js'
import { registerPickNextTaskTool } from '../tools/dev/pick-next-task.js'
import { registerUpdateStatusTool } from '../tools/dev/update-status.js'
import { registerViewIssueDetailTool } from '../tools/dev/view-issue-detail.js'
import { registerAssignPriorityTool } from '../tools/pm/assign-priority.js'
import { registerCreateEpicTool } from '../tools/pm/create-epic.js'
import { registerCreateMilestoneTool } from '../tools/pm/create-milestone.js'
import { registerPmTools } from '../tools/pm/index.js'
import { registerListPmMilestonesTool } from '../tools/pm/list-milestones.js'
import { registerMilestoneOverviewTool } from '../tools/pm/milestone-overview.js'
import { registerViewRoadmapTool } from '../tools/pm/view-roadmap.js'
import { registerGetIssueTool } from '../tools/shared/get-issue.js'
import { registerSharedTools } from '../tools/shared/index.js'
import { registerListMilestonesTool } from '../tools/shared/list-milestones.js'
import { registerSearchIssuesTool } from '../tools/shared/search-issues.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const VALID_MILESTONE_ID = 'a0000000-0000-0000-0000-000000000001'
const VALID_ISSUE_ID = 'b0000000-0000-0000-0000-000000000001'
const VALID_USER_ID = 'c0000000-0000-0000-0000-000000000001'
const VALID_COMMENT_ID = 'd0000000-0000-0000-0000-000000000001'
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function okResult<T>(value: T) {
  return { ok: true as const, value }
}

function createMockDependencies(overrides?: Partial<McpServerDependencies>): McpServerDependencies {
  return {
    createIssue: { execute: vi.fn() } as unknown as McpServerDependencies['createIssue'],
    createMilestone: { execute: vi.fn() } as unknown as McpServerDependencies['createMilestone'],
    updateIssue: { execute: vi.fn() } as unknown as McpServerDependencies['updateIssue'],
    getMilestoneOverview: { execute: vi.fn() } as unknown as McpServerDependencies['getMilestoneOverview'],
    listMilestones: { execute: vi.fn() } as unknown as McpServerDependencies['listMilestones'],
    updateMilestone: { execute: vi.fn() } as unknown as McpServerDependencies['updateMilestone'],
    deleteMilestone: { execute: vi.fn() } as unknown as McpServerDependencies['deleteMilestone'],
    listIssues: { execute: vi.fn() } as unknown as McpServerDependencies['listIssues'],
    updateState: { execute: vi.fn() } as unknown as McpServerDependencies['updateState'],
    assignIssue: { execute: vi.fn() } as unknown as McpServerDependencies['assignIssue'],
    deleteIssue: { execute: vi.fn() } as unknown as McpServerDependencies['deleteIssue'],
    reparentIssue: { execute: vi.fn() } as unknown as McpServerDependencies['reparentIssue'],
    createComment: { execute: vi.fn() } as unknown as McpServerDependencies['createComment'],
    updateComment: { execute: vi.fn() } as unknown as McpServerDependencies['updateComment'],
    deleteComment: { execute: vi.fn() } as unknown as McpServerDependencies['deleteComment'],
    getCommentsByIssue: { execute: vi.fn() } as unknown as McpServerDependencies['getCommentsByIssue'],
    issueRepository: { getById: vi.fn() } as unknown as McpServerDependencies['issueRepository'],
    ...overrides,
  }
}

async function connectClientToServer(server: McpServer) {
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

  await server.connect(serverTransport)
  await client.connect(clientTransport)

  return {
    client,
    cleanup: async () => {
      await client.close()
      await server.close()
    },
  }
}

function parseTextContent(result: CallToolResult) {
  const text = (result.content as Array<{ type: string, text: string }>)[0]!.text
  return JSON.parse(text)
}

function createMockIssue(overrides?: Record<string, unknown>) {
  return {
    id: VALID_ISSUE_ID,
    milestoneId: VALID_MILESTONE_ID,
    title: 'Test Issue',
    description: '',
    state: 'open',
    status: 'backlog',
    priority: 'normal',
    parentId: null,
    assigneeIds: [],
    tags: [],
    dueDate: null,
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function createMockComment(overrides?: Record<string, unknown>) {
  return {
    id: VALID_COMMENT_ID,
    issueId: VALID_ISSUE_ID,
    body: 'test',
    authorId: SYSTEM_USER_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function createMockMilestone(overrides?: Record<string, unknown>) {
  return {
    id: VALID_MILESTONE_ID,
    name: 'Test Milestone',
    description: '',
    status: 'open',
    dueDate: null,
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function createMockOverview(overrides?: Record<string, unknown>) {
  return {
    milestone: createMockMilestone(),
    totalIssues: 5,
    stateBreakdown: { open: 3, in_progress: 1, done: 1 },
    ...overrides,
  }
}

function createPaginatedResult(items: unknown[], overrides?: Record<string, unknown>) {
  return {
    items,
    total: items.length,
    page: 1,
    limit: 20,
    hasMore: false,
    ...overrides,
  }
}

// ===========================================================================
// T-02 to T-07: createMcpServer
// ===========================================================================
describe('createMcpServer', () => {
  it('t-02: returns McpServer instance', () => {
    const server = createMcpServer(createMockDependencies())
    expect(server).toBeInstanceOf(McpServer)
  })

  it('t-03: default name "meridian"', async () => {
    const server = createMcpServer(createMockDependencies())
    const { client, cleanup } = await connectClientToServer(server)
    const serverVersion = client.getServerVersion()
    expect(serverVersion?.name).toBe('meridian')
    await cleanup()
  })

  it('t-04: default version "0.0.0"', async () => {
    const server = createMcpServer(createMockDependencies())
    const { client, cleanup } = await connectClientToServer(server)
    const serverVersion = client.getServerVersion()
    expect(serverVersion?.version).toBe('0.0.0')
    await cleanup()
  })

  it('t-05: custom name', async () => {
    const server = createMcpServer(createMockDependencies(), { name: 'custom' })
    const { client, cleanup } = await connectClientToServer(server)
    const serverVersion = client.getServerVersion()
    expect(serverVersion?.name).toBe('custom')
    await cleanup()
  })

  it('t-06: custom version', async () => {
    const server = createMcpServer(createMockDependencies(), { version: '3.0.0' })
    const { client, cleanup } = await connectClientToServer(server)
    const serverVersion = client.getServerVersion()
    expect(serverVersion?.version).toBe('3.0.0')
    await cleanup()
  })

  it('t-07: registers health tool', async () => {
    const server = createMcpServer(createMockDependencies())
    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({ name: 'health_check', arguments: {} }) as CallToolResult
    const parsed = parseTextContent(result)
    expect(parsed.status).toBe('ok')
    await cleanup()
  })
})

// ===========================================================================
// T-10: registerSharedTools -- 4 tools
// ===========================================================================
describe('registerSharedTools (current)', () => {
  it('t-10: registers create_issue, search_issues, get_issue, list_milestones with shared tag', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    const result = registerSharedTools(server, registry, deps)

    expect(result.size).toBe(4)
    expect(result.has('create_issue')).toBe(true)
    expect(result.has('search_issues')).toBe(true)
    expect(result.has('get_issue')).toBe(true)
    expect(result.has('list_milestones')).toBe(true)

    for (const name of ['create_issue', 'search_issues', 'get_issue', 'list_milestones']) {
      expect(registry.getTagsForTool(name).has('shared')).toBe(true)
    }
  })
})

// ===========================================================================
// T-55: search_issues delegates to listIssues with filter+pagination
// ===========================================================================
describe('search_issues (current behavior)', () => {
  it('t-55: delegates to listIssues with filter+pagination', async () => {
    const issues = [createMockIssue()]
    const paginatedResult = createPaginatedResult(issues)

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedResult))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'search_issues',
      arguments: { state: 'open', priority: 'high', page: 2, limit: 10 },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledOnce()
    const filterArg = executeMock.mock.calls[0]![0]
    expect(filterArg.state).toBe('open')
    expect(filterArg.priority).toBe('high')
    const paginationArg = executeMock.mock.calls[0]![1]
    expect(paginationArg).toEqual({ page: 2, limit: 10 })
    expect(result.isError).toBeFalsy()

    await cleanup()
  })
})

// ===========================================================================
// T-56: get_issue delegates to issueRepository.getById
// ===========================================================================
describe('get_issue (current behavior)', () => {
  it('t-56: delegates to issueRepository.getById', async () => {
    const mockIssue = createMockIssue()
    const deps = createMockDependencies()
    const getByIdMock = vi.fn().mockResolvedValue(mockIssue)
    deps.issueRepository = { getById: getByIdMock } as unknown as McpServerDependencies['issueRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerGetIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'get_issue',
      arguments: { issueId: VALID_ISSUE_ID },
    }) as CallToolResult

    expect(getByIdMock).toHaveBeenCalledWith(VALID_ISSUE_ID)
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.id).toBe(VALID_ISSUE_ID)

    await cleanup()
  })

  it('t-56b: NotFoundError handled', async () => {
    const deps = createMockDependencies()
    const getByIdMock = vi.fn().mockRejectedValue(new NotFoundError('Issue', VALID_ISSUE_ID))
    deps.issueRepository = { getById: getByIdMock } as unknown as McpServerDependencies['issueRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerGetIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'get_issue',
      arguments: { issueId: VALID_ISSUE_ID },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')

    await cleanup()
  })
})

// ===========================================================================
// T-57: update_status delegates to updateState use case
// ===========================================================================
describe('update_status (current behavior)', () => {
  it('t-57: delegates to updateState use case', async () => {
    const mockIssue = createMockIssue({ state: 'in_progress' })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.updateState = { execute: executeMock } as unknown as McpServerDependencies['updateState']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerUpdateStatusTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'update_status',
      arguments: { issueId: VALID_ISSUE_ID, state: 'in_progress' },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledWith(VALID_ISSUE_ID, 'in_progress', SYSTEM_USER_ID)
    expect(result.isError).toBeFalsy()

    await cleanup()
  })
})

// ===========================================================================
// T-58: assign_priority delegates to updateIssue use case
// ===========================================================================
describe('assign_priority (current behavior)', () => {
  it('t-58: delegates to updateIssue use case', async () => {
    const updatedIssue = createMockIssue({ priority: 'high' })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(updatedIssue))
    deps.updateIssue = { execute: executeMock } as unknown as McpServerDependencies['updateIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()

    registerAssignPriorityTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'assign_priority',
      arguments: { issueId: VALID_ISSUE_ID, priority: 'high' },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledWith(VALID_ISSUE_ID, { priority: 'high' }, SYSTEM_USER_ID)
    expect(result.isError).toBeFalsy()

    await cleanup()
  })
})

// ===========================================================================
// T-59: view_roadmap delegates to getMilestoneOverview, formats summary
// ===========================================================================
describe('view_roadmap (current behavior)', () => {
  it('t-59: delegates to getMilestoneOverview and returns formatted summary', async () => {
    const overview = createMockOverview({ totalIssues: 10, stateBreakdown: { open: 5, in_progress: 3, done: 2 } })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(overview))
    deps.getMilestoneOverview = { execute: executeMock } as unknown as McpServerDependencies['getMilestoneOverview']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerViewRoadmapTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'view_roadmap',
      arguments: { milestoneId: VALID_MILESTONE_ID },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledWith(VALID_MILESTONE_ID)
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.milestoneName).toBe('Test Milestone')
    expect(typeof parsed.completionPercentage).toBe('number')

    await cleanup()
  })
})

// ===========================================================================
// T-60: milestone_overview delegates to getMilestoneOverview, raw result
// ===========================================================================
describe('milestone_overview (current behavior)', () => {
  it('t-60: delegates to getMilestoneOverview and returns raw result', async () => {
    const overview = createMockOverview({
      totalIssues: 10,
      stateBreakdown: { open: 5, in_progress: 3, done: 2 },
    })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(overview))
    deps.getMilestoneOverview = { execute: executeMock } as unknown as McpServerDependencies['getMilestoneOverview']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerMilestoneOverviewTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'milestone_overview',
      arguments: { milestoneId: VALID_MILESTONE_ID },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledWith(VALID_MILESTONE_ID)
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.totalIssues).toBe(10)
    expect(parsed.stateBreakdown).toBeDefined()
    expect(parsed.stateBreakdown.open).toBe(5)

    await cleanup()
  })
})

// ===========================================================================
// E-01 to E-06: Edge cases
// ===========================================================================
describe('edge cases (current behavior)', () => {
  it('e-01: handler exception caught returns Internal error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockRejectedValue(new Error('crash'))
    deps.updateState = { execute: executeMock } as unknown as McpServerDependencies['updateState']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerUpdateStatusTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'update_status',
      arguments: { issueId: VALID_ISSUE_ID, state: 'open' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const text = (result.content as Array<{ type: string, text: string }>)[0]!.text
    expect(text).toContain('Internal error')

    await cleanup()
  })

  it('e-02: DomainError in handler returns formatted error', async () => {
    const deps = createMockDependencies()
    const getByIdMock = vi.fn().mockRejectedValue(new NotFoundError('Issue', VALID_ISSUE_ID))
    deps.issueRepository = { getById: getByIdMock } as unknown as McpServerDependencies['issueRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerGetIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'get_issue',
      arguments: { issueId: VALID_ISSUE_ID },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')

    await cleanup()
  })

  it('e-04: create_milestone name at boundary 200 chars accepted', async () => {
    const longName = 'a'.repeat(200)
    const mockMilestone = createMockMilestone({ name: longName })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockMilestone))
    deps.createMilestone = { execute: executeMock } as unknown as McpServerDependencies['createMilestone']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateMilestoneTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_milestone',
      arguments: { name: longName },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    expect(executeMock).toHaveBeenCalledOnce()

    await cleanup()
  })

  it('e-05: create_epic title at boundary 500 chars accepted', async () => {
    const longTitle = 'a'.repeat(500)
    const mockIssue = createMockIssue({ title: longTitle, metadata: { type: 'epic' } })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: VALID_MILESTONE_ID, title: longTitle },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    expect(executeMock).toHaveBeenCalledOnce()

    await cleanup()
  })

  it('e-06a: search_issues limit exceeds max 100 rejected', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'search_issues',
      arguments: { limit: 101 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('e-06b: list_my_issues limit exceeds max 50 rejected', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMyIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: VALID_USER_ID, limit: 51 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('e-06c: pick_next_task limit exceeds max 10 rejected', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerPickNextTaskTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'pick_next_task',
      arguments: { limit: 11 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('e-06d: list_pm_milestones limit exceeds max 50 rejected', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listMilestones = { execute: executeMock } as unknown as McpServerDependencies['listMilestones']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListPmMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_pm_milestones',
      arguments: { limit: 51 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })
})

// ===========================================================================
// Current tool counts and registration (post-refactoring snapshot)
// ===========================================================================
describe('current tool registration snapshot', () => {
  it('current: total tool count is 21', async () => {
    const server = createMcpServer(createMockDependencies())
    const { client, cleanup } = await connectClientToServer(server)

    const result = await client.listTools()

    expect(result.tools).toHaveLength(21)

    await cleanup()
  })

  it('current: all 21 tool names present', async () => {
    const server = createMcpServer(createMockDependencies())
    const { client, cleanup } = await connectClientToServer(server)

    const result = await client.listTools()
    const names = result.tools.map(t => t.name)

    const expectedTools = [
      'health_check',
      'create_issue',
      'search_issues',
      'get_issue',
      'list_milestones',
      'create_epic',
      'create_milestone',
      'view_roadmap',
      'assign_priority',
      'list_pm_milestones',
      'milestone_overview',
      'reparent_issue',
      'delete_issue',
      'pick_next_task',
      'update_status',
      'view_issue_detail',
      'list_my_issues',
      'add_comment',
      'update_comment',
      'delete_comment',
      'list_issue_comments',
    ]

    for (const name of expectedTools) {
      expect(names).toContain(name)
    }

    await cleanup()
  })

  it('current: registerPmTools registers 8 PM tools', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    const result = registerPmTools(server, registry, deps)

    expect(result.size).toBe(8)
    const expectedPmTools = ['create_epic', 'create_milestone', 'view_roadmap', 'assign_priority', 'list_pm_milestones', 'milestone_overview', 'reparent_issue', 'delete_issue']
    for (const name of expectedPmTools) {
      expect(result.has(name)).toBe(true)
      expect(registry.getTagsForTool(name).has('pm')).toBe(true)
    }
  })

  it('current: registerDevTools registers 8 dev tools', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    const result = registerDevTools(server, registry, deps)

    expect(result.size).toBe(8)
    const expectedDevTools = ['pick_next_task', 'update_status', 'view_issue_detail', 'list_my_issues', 'add_comment', 'update_comment', 'delete_comment', 'list_issue_comments']
    for (const name of expectedDevTools) {
      expect(result.has(name)).toBe(true)
      expect(registry.getTagsForTool(name).has('dev')).toBe(true)
    }
  })
})

// ===========================================================================
// Current tag-based filtering (post-refactoring counts)
// ===========================================================================
describe('current tag-based filtering', () => {
  it('current: no filter - all 21 tools visible', async () => {
    const server = createMcpServer(createMockDependencies())
    const { client, cleanup } = await connectClientToServer(server)

    const result = await client.listTools()

    expect(result.tools).toHaveLength(21)

    await cleanup()
  })

  it('current: includeTags=pm - 13 tools (8 pm + 4 shared + health)', async () => {
    const server = createMcpServer(createMockDependencies(), { includeTags: new Set(['pm']) })
    const { client, cleanup } = await connectClientToServer(server)

    const result = await client.listTools()
    const names = result.tools.map(t => t.name)

    expect(result.tools).toHaveLength(13)

    const pmTools = ['create_epic', 'create_milestone', 'view_roadmap', 'assign_priority', 'list_pm_milestones', 'milestone_overview', 'reparent_issue', 'delete_issue']
    const sharedTools = ['create_issue', 'search_issues', 'get_issue', 'list_milestones']

    for (const name of pmTools) {
      expect(names).toContain(name)
    }
    for (const name of sharedTools) {
      expect(names).toContain(name)
    }
    expect(names).toContain('health_check')

    const devTools = ['pick_next_task', 'update_status', 'view_issue_detail', 'list_my_issues', 'add_comment', 'update_comment', 'delete_comment', 'list_issue_comments']
    for (const name of devTools) {
      expect(names).not.toContain(name)
    }

    await cleanup()
  })

  it('current: includeTags=dev - 13 tools (8 dev + 4 shared + health)', async () => {
    const server = createMcpServer(createMockDependencies(), { includeTags: new Set(['dev']) })
    const { client, cleanup } = await connectClientToServer(server)

    const result = await client.listTools()
    const names = result.tools.map(t => t.name)

    expect(result.tools).toHaveLength(13)

    const devTools = ['pick_next_task', 'update_status', 'view_issue_detail', 'list_my_issues', 'add_comment', 'update_comment', 'delete_comment', 'list_issue_comments']
    const sharedTools = ['create_issue', 'search_issues', 'get_issue', 'list_milestones']

    for (const name of devTools) {
      expect(names).toContain(name)
    }
    for (const name of sharedTools) {
      expect(names).toContain(name)
    }
    expect(names).toContain('health_check')

    const pmTools = ['create_epic', 'create_milestone', 'view_roadmap', 'assign_priority', 'list_pm_milestones', 'milestone_overview', 'reparent_issue', 'delete_issue']
    for (const name of pmTools) {
      expect(names).not.toContain(name)
    }

    await cleanup()
  })

  it('current: excludeTags=shared - hides shared + health', async () => {
    const server = createMcpServer(createMockDependencies(), { excludeTags: new Set(['shared']) })
    const { client, cleanup } = await connectClientToServer(server)

    const result = await client.listTools()
    const names = result.tools.map(t => t.name)

    expect(names).not.toContain('health_check')
    expect(names).not.toContain('create_issue')
    expect(names).not.toContain('search_issues')
    expect(names).not.toContain('get_issue')
    expect(names).not.toContain('list_milestones')

    const pmTools = ['create_epic', 'create_milestone', 'view_roadmap', 'assign_priority', 'list_pm_milestones', 'milestone_overview', 'reparent_issue', 'delete_issue']
    const devTools = ['pick_next_task', 'update_status', 'view_issue_detail', 'list_my_issues', 'add_comment', 'update_comment', 'delete_comment', 'list_issue_comments']
    for (const name of pmTools) {
      expect(names).toContain(name)
    }
    for (const name of devTools) {
      expect(names).toContain(name)
    }

    await cleanup()
  })

  it('current: includeTags=pm + excludeTags=shared - only pm visible', async () => {
    const server = createMcpServer(createMockDependencies(), {
      includeTags: new Set(['pm']),
      excludeTags: new Set(['shared']),
    })
    const { client, cleanup } = await connectClientToServer(server)

    const result = await client.listTools()
    const names = result.tools.map(t => t.name)

    const pmTools = ['create_epic', 'create_milestone', 'view_roadmap', 'assign_priority', 'list_pm_milestones', 'milestone_overview', 'reparent_issue', 'delete_issue']
    for (const name of pmTools) {
      expect(names).toContain(name)
    }

    expect(names).not.toContain('health_check')
    expect(names).not.toContain('create_issue')
    expect(names).not.toContain('search_issues')
    expect(names).not.toContain('get_issue')
    expect(names).not.toContain('list_milestones')

    const devTools = ['pick_next_task', 'update_status', 'view_issue_detail', 'list_my_issues', 'add_comment', 'update_comment', 'delete_comment', 'list_issue_comments']
    for (const name of devTools) {
      expect(names).not.toContain(name)
    }

    await cleanup()
  })
})

// ===========================================================================
// add_comment behavior (uses CreateCommentUseCase)
// ===========================================================================
describe('add_comment (current behavior)', () => {
  it('current: success calls createComment.execute with issueId, body, authorId', async () => {
    const mockComment = createMockComment()
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockComment))
    deps.createComment = { execute: executeMock } as unknown as McpServerDependencies['createComment']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerAddCommentTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'add_comment',
      arguments: { issueId: VALID_ISSUE_ID, body: 'Hello world' },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledOnce()
    const callArg = executeMock.mock.calls[0]![0]
    expect(callArg.issueId).toBe(VALID_ISSUE_ID)
    expect(callArg.body).toBe('Hello world')
    expect(callArg.authorId).toBe(SYSTEM_USER_ID)
    expect(result.isError).toBeFalsy()

    await cleanup()
  })

  it('current: empty body rejected by Zod', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createComment = { execute: executeMock } as unknown as McpServerDependencies['createComment']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerAddCommentTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'add_comment',
      arguments: { issueId: VALID_ISSUE_ID, body: '' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('current: invalid issueId rejected by Zod', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createComment = { execute: executeMock } as unknown as McpServerDependencies['createComment']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerAddCommentTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'add_comment',
      arguments: { issueId: 'bad', body: 'hello' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })
})

// ===========================================================================
// view_issue_detail behavior (uses getCommentsByIssue use case)
// ===========================================================================
describe('view_issue_detail (current behavior)', () => {
  it('current: composes issueRepository.getById + getCommentsByIssue.execute', async () => {
    const mockIssue = createMockIssue()
    const mockComments = [createMockComment()]
    const paginatedComments = createPaginatedResult(mockComments, { limit: 50 })

    const deps = createMockDependencies()
    const getByIdMock = vi.fn().mockResolvedValue(mockIssue)
    const getCommentsMock = vi.fn().mockResolvedValue(okResult(paginatedComments))
    deps.issueRepository = { getById: getByIdMock } as unknown as McpServerDependencies['issueRepository']
    deps.getCommentsByIssue = { execute: getCommentsMock } as unknown as McpServerDependencies['getCommentsByIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerViewIssueDetailTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'view_issue_detail',
      arguments: { issueId: VALID_ISSUE_ID },
    }) as CallToolResult

    expect(getByIdMock).toHaveBeenCalledWith(VALID_ISSUE_ID)
    expect(getCommentsMock).toHaveBeenCalled()
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.issue).toBeDefined()
    expect(parsed.comments).toBeInstanceOf(Array)

    await cleanup()
  })

  it('current: no comments returns empty array', async () => {
    const mockIssue = createMockIssue()
    const paginatedComments = createPaginatedResult([], { limit: 50 })

    const deps = createMockDependencies()
    const getByIdMock = vi.fn().mockResolvedValue(mockIssue)
    const getCommentsMock = vi.fn().mockResolvedValue(okResult(paginatedComments))
    deps.issueRepository = { getById: getByIdMock } as unknown as McpServerDependencies['issueRepository']
    deps.getCommentsByIssue = { execute: getCommentsMock } as unknown as McpServerDependencies['getCommentsByIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerViewIssueDetailTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'view_issue_detail',
      arguments: { issueId: VALID_ISSUE_ID },
    }) as CallToolResult

    const parsed = parseTextContent(result)
    expect(parsed.comments).toEqual([])

    await cleanup()
  })

  it('current: getById throws NotFoundError', async () => {
    const deps = createMockDependencies()
    const getByIdMock = vi.fn().mockRejectedValue(new NotFoundError('Issue', VALID_ISSUE_ID))
    deps.issueRepository = { getById: getByIdMock } as unknown as McpServerDependencies['issueRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerViewIssueDetailTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'view_issue_detail',
      arguments: { issueId: VALID_ISSUE_ID },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')

    await cleanup()
  })
})

// ===========================================================================
// list_milestones behavior (uses listMilestones use case)
// ===========================================================================
describe('list_milestones (current behavior)', () => {
  it('current: delegates to listMilestones.execute', async () => {
    const ms1 = createMockMilestone({ name: 'MS 1' })
    const ms2 = createMockMilestone({ id: 'a0000000-0000-0000-0000-000000000002', name: 'MS 2' })
    const paginatedResult = createPaginatedResult([ms1, ms2])

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedResult))
    deps.listMilestones = { execute: executeMock } as unknown as McpServerDependencies['listMilestones']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_milestones',
      arguments: {},
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledWith({ page: 1, limit: 20 })
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items).toHaveLength(2)

    await cleanup()
  })
})

// ===========================================================================
// list_pm_milestones behavior (uses listMilestones use case)
// ===========================================================================
describe('list_pm_milestones (current behavior)', () => {
  it('current: delegates to listMilestones.execute', async () => {
    const ms = createMockMilestone()
    const paginatedResult = createPaginatedResult([ms])

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedResult))
    deps.listMilestones = { execute: executeMock } as unknown as McpServerDependencies['listMilestones']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListPmMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_pm_milestones',
      arguments: {},
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledWith({ page: 1, limit: 20 })
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items).toHaveLength(1)

    await cleanup()
  })
})

// ===========================================================================
// create_milestone behavior (name, description, metadata, status, dueDate)
// ===========================================================================
describe('create_milestone (current behavior)', () => {
  it('current: name, description, metadata passed to use case', async () => {
    const mockMilestone = createMockMilestone({ description: 'D', metadata: { k: 'v' } })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockMilestone))
    deps.createMilestone = { execute: executeMock } as unknown as McpServerDependencies['createMilestone']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateMilestoneTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_milestone',
      arguments: { name: 'Test', description: 'D', metadata: { k: 'v' } },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledOnce()
    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.name).toBe('Test')
    expect(firstArg.description).toBe('D')
    expect(firstArg.metadata).toEqual({ k: 'v' })
    expect(result.isError).toBeFalsy()

    await cleanup()
  })

  it('current: empty name rejected by Zod', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createMilestone = { execute: executeMock } as unknown as McpServerDependencies['createMilestone']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateMilestoneTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_milestone',
      arguments: { name: '' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('current: missing name rejected', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createMilestone = { execute: executeMock } as unknown as McpServerDependencies['createMilestone']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateMilestoneTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_milestone',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })
})
