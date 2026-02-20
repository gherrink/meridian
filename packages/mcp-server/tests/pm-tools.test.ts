import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpServerDependencies } from '../src/types.js'

import { NotFoundError, ValidationError } from '@meridian/core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it, vi } from 'vitest'

import { ToolTagRegistry } from '../src/helpers/tool-tag-registry.js'
import { createMcpServer } from '../src/server.js'
import { registerAssignPriorityTool } from '../src/tools/pm/assign-priority.js'
import { registerCreateEpicTool } from '../src/tools/pm/create-epic.js'
import { registerPmTools } from '../src/tools/pm/index.js'
import { registerListPmMilestonesTool } from '../src/tools/pm/list-milestones.js'
import { registerMilestoneOverviewTool } from '../src/tools/pm/milestone-overview.js'
import { registerViewRoadmapTool } from '../src/tools/pm/view-roadmap.js'

const VALID_MILESTONE_ID = 'a0000000-0000-0000-0000-000000000001'
const VALID_ISSUE_ID = 'b0000000-0000-0000-0000-000000000001'
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

function okResult<T>(value: T) {
  return { ok: true as const, value }
}

function errResult(error: { code: string, message: string }) {
  return { ok: false as const, error }
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
    listIssues: {} as McpServerDependencies['listIssues'],
    updateState: {} as McpServerDependencies['updateState'],
    assignIssue: {} as McpServerDependencies['assignIssue'],
    deleteIssue: { execute: vi.fn() } as unknown as McpServerDependencies['deleteIssue'],
    reparentIssue: { execute: vi.fn() } as unknown as McpServerDependencies['reparentIssue'],
    createComment: { execute: vi.fn() } as unknown as McpServerDependencies['createComment'],
    updateComment: { execute: vi.fn() } as unknown as McpServerDependencies['updateComment'],
    deleteComment: { execute: vi.fn() } as unknown as McpServerDependencies['deleteComment'],
    getCommentsByIssue: { execute: vi.fn() } as unknown as McpServerDependencies['getCommentsByIssue'],
    issueRepository: {} as McpServerDependencies['issueRepository'],
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
    title: 'My Epic',
    description: '',
    state: 'open',
    status: 'backlog',
    priority: 'normal',
    parentId: null,
    assigneeIds: [],
    tags: [],
    dueDate: null,
    metadata: { type: 'epic' },
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

// ---------------------------------------------------------------------------
// registerPmTools (index barrel)
// ---------------------------------------------------------------------------
describe('registerPmTools', () => {
  it('tC-01: registers all 8 PM tools', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    const result = registerPmTools(server, registry, deps)

    expect(result.has('create_epic')).toBe(true)
    expect(result.has('create_milestone')).toBe(true)
    expect(result.has('view_roadmap')).toBe(true)
    expect(result.has('assign_priority')).toBe(true)
    expect(result.has('list_pm_milestones')).toBe(true)
    expect(result.has('milestone_overview')).toBe(true)
    expect(result.has('reparent_issue')).toBe(true)
    expect(result.has('delete_issue')).toBe(true)
  })

  it('tC-02: all 8 tools tagged with pm', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerPmTools(server, registry, deps)

    const toolNames = ['create_epic', 'create_milestone', 'view_roadmap', 'assign_priority', 'list_pm_milestones', 'milestone_overview', 'reparent_issue', 'delete_issue']
    for (const name of toolNames) {
      expect(registry.getTagsForTool(name).has('pm')).toBe(true)
    }
  })

  it('tC-03: tools are listable by MCP client', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerPmTools(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const listResult = await client.listTools()
    const toolNames = listResult.tools.map(t => t.name)

    expect(toolNames).toContain('create_epic')
    expect(toolNames).toContain('create_milestone')
    expect(toolNames).toContain('view_roadmap')
    expect(toolNames).toContain('assign_priority')
    expect(toolNames).toContain('list_pm_milestones')
    expect(toolNames).toContain('milestone_overview')
    expect(toolNames).toContain('reparent_issue')
    expect(toolNames).toContain('delete_issue')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// create_epic (unchanged)
// ---------------------------------------------------------------------------
describe('create_epic', () => {
  it('tC-04: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerCreateEpicTool(server, registry, deps)).not.toThrow()
  })

  it('tC-05: tagged with pm', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerCreateEpicTool(server, registry, deps)

    expect(registry.getTagsForTool('create_epic').has('pm')).toBe(true)
  })

  it('tC-06: success: delegates to createIssue use case', async () => {
    const mockIssue = createMockIssue()
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: VALID_MILESTONE_ID, title: 'My Epic' },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledOnce()
    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.milestoneId).toBe(VALID_MILESTONE_ID)
    expect(firstArg.title).toBe('My Epic')
    expect(firstArg.metadata.type).toBe('epic')
    expect(executeMock.mock.calls[0]![1]).toBe(SYSTEM_USER_ID)
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.id).toBe(VALID_ISSUE_ID)

    await cleanup()
  })

  it('tC-07: success with parentId', async () => {
    const mockIssue = createMockIssue({ parentId: VALID_ISSUE_ID })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: VALID_MILESTONE_ID, title: 'My Epic', parentId: VALID_ISSUE_ID },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.parentId).toBe(VALID_ISSUE_ID)

    await cleanup()
  })

  it('tC-08: success with optional description', async () => {
    const mockIssue = createMockIssue({ description: 'Scope text' })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: VALID_MILESTONE_ID, title: 'My Epic', description: 'Scope text' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.description).toBe('Scope text')

    await cleanup()
  })

  it('tC-09: success without parentId defaults to null', async () => {
    const mockIssue = createMockIssue()
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: VALID_MILESTONE_ID, title: 'My Epic' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.metadata.type).toBe('epic')
    expect(firstArg.parentId).toBeNull()

    await cleanup()
  })

  it('tC-10: use case returns validation error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new ValidationError('title', 'Required')))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: VALID_MILESTONE_ID, title: 'X' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('VALIDATION_ERROR')

    await cleanup()
  })

  it('tC-11: use case returns not-found error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new NotFoundError('Milestone', VALID_MILESTONE_ID)))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: VALID_MILESTONE_ID, title: 'X' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// view_roadmap (unchanged)
// ---------------------------------------------------------------------------
describe('view_roadmap', () => {
  it('tC-12: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerViewRoadmapTool(server, registry, deps)).not.toThrow()
  })

  it('tC-13: tagged with pm', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerViewRoadmapTool(server, registry, deps)

    expect(registry.getTagsForTool('view_roadmap').has('pm')).toBe(true)
  })

  it('tC-14: success: delegates to getMilestoneOverview', async () => {
    const overview = createMockOverview({ totalIssues: 5 })
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
    expect(parsed.totalIssues).toBe(5)

    await cleanup()
  })

  it('tC-15: not-found error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new NotFoundError('Milestone', VALID_MILESTONE_ID)))
    deps.getMilestoneOverview = { execute: executeMock } as unknown as McpServerDependencies['getMilestoneOverview']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerViewRoadmapTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'view_roadmap',
      arguments: { milestoneId: VALID_MILESTONE_ID },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// assign_priority (unchanged)
// ---------------------------------------------------------------------------
describe('assign_priority', () => {
  it('tC-16: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerAssignPriorityTool(server, registry, deps)).not.toThrow()
  })

  it('tC-17: tagged with pm', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerAssignPriorityTool(server, registry, deps)

    expect(registry.getTagsForTool('assign_priority').has('pm')).toBe(true)
  })

  it('tC-18: success: delegates to updateIssue', async () => {
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

  it('tC-19: accepts all valid priorities', async () => {
    const priorities = ['low', 'normal', 'high', 'urgent'] as const

    for (const priority of priorities) {
      const updatedIssue = createMockIssue({ priority })
      const deps = createMockDependencies()
      const executeMock = vi.fn().mockResolvedValue(okResult(updatedIssue))
      deps.updateIssue = { execute: executeMock } as unknown as McpServerDependencies['updateIssue']

      const server = new McpServer({ name: 'test', version: '1.0.0' })
      const registry = new ToolTagRegistry()
      registerAssignPriorityTool(server, registry, deps)

      const { client, cleanup } = await connectClientToServer(server)
      const result = await client.callTool({
        name: 'assign_priority',
        arguments: { issueId: VALID_ISSUE_ID, priority },
      }) as CallToolResult

      expect(result.isError).toBeFalsy()
      expect(executeMock).toHaveBeenCalledWith(VALID_ISSUE_ID, { priority }, SYSTEM_USER_ID)

      await cleanup()
    }
  })

  it('tC-20: not-found error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new NotFoundError('Issue', VALID_ISSUE_ID)))
    deps.updateIssue = { execute: executeMock } as unknown as McpServerDependencies['updateIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerAssignPriorityTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'assign_priority',
      arguments: { issueId: VALID_ISSUE_ID, priority: 'high' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')

    await cleanup()
  })

  it('tC-21: validation error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new ValidationError('priority', 'Invalid')))
    deps.updateIssue = { execute: executeMock } as unknown as McpServerDependencies['updateIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerAssignPriorityTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'assign_priority',
      arguments: { issueId: VALID_ISSUE_ID, priority: 'high' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('VALIDATION_ERROR')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// list_pm_milestones (updated to use listMilestones use case)
// ---------------------------------------------------------------------------
describe('list_pm_milestones', () => {
  it('tC-22: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerListPmMilestonesTool(server, registry, deps)).not.toThrow()
  })

  it('tC-23: tagged with pm', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerListPmMilestonesTool(server, registry, deps)

    expect(registry.getTagsForTool('list_pm_milestones').has('pm')).toBe(true)
  })

  it('tC-24: success: delegates to listMilestones.execute', async () => {
    const ms1 = createMockMilestone({ id: VALID_MILESTONE_ID, name: 'Milestone 1' })
    const ms2 = createMockMilestone({ id: 'a0000000-0000-0000-0000-000000000002', name: 'Milestone 2' })
    const paginatedResult = { items: [ms1, ms2], total: 2, page: 1, limit: 20, hasMore: false }
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
    expect(parsed.items).toHaveLength(2)

    await cleanup()
  })

  it('tC-25: custom pagination', async () => {
    const paginatedResult = { items: [], total: 0, page: 2, limit: 10, hasMore: false }
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedResult))
    deps.listMilestones = { execute: executeMock } as unknown as McpServerDependencies['listMilestones']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListPmMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'list_pm_milestones',
      arguments: { page: 2, limit: 10 },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledWith({ page: 2, limit: 10 })

    await cleanup()
  })

  it('tC-26: uses unwrapResultToMcpResponse', async () => {
    const paginatedResult = { items: [createMockMilestone()], total: 1, page: 1, limit: 20, hasMore: false }
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

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items).toBeDefined()
    expect(parsed.total).toBeDefined()

    await cleanup()
  })

  it('tC-27: empty result', async () => {
    const paginatedResult = { items: [], total: 0, page: 1, limit: 20, hasMore: false }
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

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items).toEqual([])

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// milestone_overview (unchanged)
// ---------------------------------------------------------------------------
describe('milestone_overview', () => {
  it('tC-28: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerMilestoneOverviewTool(server, registry, deps)).not.toThrow()
  })

  it('tC-29: tagged with pm', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerMilestoneOverviewTool(server, registry, deps)

    expect(registry.getTagsForTool('milestone_overview').has('pm')).toBe(true)
  })

  it('tC-30: success: delegates to getMilestoneOverview', async () => {
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

    await cleanup()
  })

  it('tC-31: not-found error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new NotFoundError('Milestone', VALID_MILESTONE_ID)))
    deps.getMilestoneOverview = { execute: executeMock } as unknown as McpServerDependencies['getMilestoneOverview']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerMilestoneOverviewTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'milestone_overview',
      arguments: { milestoneId: VALID_MILESTONE_ID },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// Edge Cases (updated - list_pm_milestones now uses listMilestones use case)
// ---------------------------------------------------------------------------
describe('edge cases', () => {
  it('tC-32: create_epic: empty title rejected by Zod', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: VALID_MILESTONE_ID, title: '' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-33: create_epic: invalid milestoneId (not UUID)', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_epic',
      arguments: { milestoneId: 'not-a-uuid', title: 'X' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-34: assign_priority: invalid priority value', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.updateIssue = { execute: executeMock } as unknown as McpServerDependencies['updateIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerAssignPriorityTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'assign_priority',
      arguments: { issueId: VALID_ISSUE_ID, priority: 'critical' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-35: assign_priority: invalid issueId (not UUID)', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.updateIssue = { execute: executeMock } as unknown as McpServerDependencies['updateIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerAssignPriorityTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'assign_priority',
      arguments: { issueId: 'bad', priority: 'high' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-36: view_roadmap: missing milestoneId', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.getMilestoneOverview = { execute: executeMock } as unknown as McpServerDependencies['getMilestoneOverview']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerViewRoadmapTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'view_roadmap',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-37: milestone_overview: missing milestoneId', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.getMilestoneOverview = { execute: executeMock } as unknown as McpServerDependencies['getMilestoneOverview']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerMilestoneOverviewTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'milestone_overview',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-38: list_pm_milestones: limit exceeds max 50', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listMilestones = { execute: executeMock } as unknown as McpServerDependencies['listMilestones']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListPmMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_pm_milestones',
      arguments: { limit: 100 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-39: list_pm_milestones: page 0 (non-positive)', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listMilestones = { execute: executeMock } as unknown as McpServerDependencies['listMilestones']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListPmMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_pm_milestones',
      arguments: { page: 0 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// Server integration
// ---------------------------------------------------------------------------
describe('server integration', () => {
  async function listToolNames(server: McpServer): Promise<string[]> {
    const { client, cleanup } = await connectClientToServer(server)
    const listResult = await client.listTools()
    const names = listResult.tools.map(t => t.name)
    await cleanup()
    return names
  }

  const PM_TOOL_NAMES = ['create_epic', 'create_milestone', 'view_roadmap', 'assign_priority', 'list_pm_milestones', 'milestone_overview', 'reparent_issue', 'delete_issue']

  it('tC-40: PM tools visible when no tag filter', async () => {
    const server = createMcpServer(createMockDependencies())

    const toolNames = await listToolNames(server)

    for (const name of PM_TOOL_NAMES) {
      expect(toolNames).toContain(name)
    }
  })

  it('tC-41: PM tools visible with includeTags=pm', async () => {
    const server = createMcpServer(createMockDependencies(), {
      includeTags: new Set(['pm']),
    })

    const toolNames = await listToolNames(server)

    for (const name of PM_TOOL_NAMES) {
      expect(toolNames).toContain(name)
    }
  })

  it('tC-42: PM tools hidden with excludeTags=pm', async () => {
    const server = createMcpServer(createMockDependencies(), {
      excludeTags: new Set(['pm']),
    })

    const toolNames = await listToolNames(server)

    for (const name of PM_TOOL_NAMES) {
      expect(toolNames).not.toContain(name)
    }
  })
})
