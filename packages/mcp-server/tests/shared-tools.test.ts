import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpServerDependencies } from '../src/types.js'

import { ConflictError, NotFoundError, ValidationError } from '@meridian/core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it, vi } from 'vitest'

import { ToolTagRegistry } from '../src/helpers/tool-tag-registry.js'
import { createMcpServer } from '../src/server.js'
import { registerCreateIssueTool } from '../src/tools/shared/create-issue.js'
import { registerGetIssueTool } from '../src/tools/shared/get-issue.js'
import { registerSharedTools } from '../src/tools/shared/index.js'
import { registerListMilestonesTool } from '../src/tools/shared/list-milestones.js'
import { registerSearchIssuesTool } from '../src/tools/shared/search-issues.js'

const VALID_MILESTONE_ID = 'a0000000-0000-0000-0000-000000000001'
const VALID_ISSUE_ID = 'b0000000-0000-0000-0000-000000000001'
const VALID_USER_ID = 'c0000000-0000-0000-0000-000000000001'
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'
const VALID_TAG_ID = 'd0000000-0000-0000-0000-000000000001'

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

// ---------------------------------------------------------------------------
// registerSharedTools (index barrel)
// ---------------------------------------------------------------------------
describe('registerSharedTools', () => {
  it('cI-00a: registers all 4 shared tools', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    const result = registerSharedTools(server, registry, deps)

    expect(result.has('search_issues')).toBe(true)
    expect(result.has('get_issue')).toBe(true)
    expect(result.has('list_milestones')).toBe(true)
    expect(result.has('create_issue')).toBe(true)
    expect(result.size).toBe(4)
  })

  it('cI-00b: all 4 tools tagged with shared', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerSharedTools(server, registry, deps)

    const toolNames = ['search_issues', 'get_issue', 'list_milestones', 'create_issue']
    for (const name of toolNames) {
      expect(registry.getTagsForTool(name).has('shared')).toBe(true)
    }
  })

  it('cI-00c: tools listable by MCP client includes create_issue', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerSharedTools(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const listResult = await client.listTools()
    const toolNames = listResult.tools.map(t => t.name)

    expect(toolNames).toContain('search_issues')
    expect(toolNames).toContain('get_issue')
    expect(toolNames).toContain('list_milestones')
    expect(toolNames).toContain('create_issue')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// search_issues
// ---------------------------------------------------------------------------
describe('search_issues', () => {
  it('tC-04: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerSearchIssuesTool(server, registry, deps)).not.toThrow()
  })

  it('tC-05: tagged with shared', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerSearchIssuesTool(server, registry, deps)

    expect(registry.getTagsForTool('search_issues').has('shared')).toBe(true)
  })

  it('tC-06: success: delegates to listIssues.execute', async () => {
    const issues = [createMockIssue(), createMockIssue({ id: 'b0000000-0000-0000-0000-000000000002', title: 'Issue 2' })]
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
      arguments: {},
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledOnce()
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items).toBeDefined()

    await cleanup()
  })

  it('tC-07: passes filter args to use case', async () => {
    const paginatedResult = createPaginatedResult([createMockIssue()])

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedResult))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'search_issues',
      arguments: { state: 'open', priority: 'high', assigneeId: VALID_USER_ID, milestoneId: VALID_MILESTONE_ID, search: 'bug' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.state).toBe('open')
    expect(firstArg.priority).toBe('high')
    expect(firstArg.assigneeId).toBe(VALID_USER_ID)
    expect(firstArg.milestoneId).toBe(VALID_MILESTONE_ID)
    expect(firstArg.search).toBe('bug')

    await cleanup()
  })

  it('tC-08: default pagination page=1 limit=20', async () => {
    const paginatedResult = createPaginatedResult([])

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedResult))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'search_issues',
      arguments: {},
    }) as CallToolResult

    const secondArg = executeMock.mock.calls[0]![1]
    expect(secondArg).toEqual({ page: 1, limit: 20 })

    await cleanup()
  })

  it('tC-09: custom pagination', async () => {
    const paginatedResult = createPaginatedResult([], { page: 3, limit: 50 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedResult))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'search_issues',
      arguments: { page: 3, limit: 50 },
    }) as CallToolResult

    const secondArg = executeMock.mock.calls[0]![1]
    expect(secondArg).toEqual({ page: 3, limit: 50 })

    await cleanup()
  })

  it('tC-10: all optional filters omitted', async () => {
    const paginatedResult = createPaginatedResult([])

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedResult))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'search_issues',
      arguments: {},
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.search).toBeUndefined()
    expect(firstArg.state).toBeUndefined()
    expect(firstArg.priority).toBeUndefined()
    expect(firstArg.assigneeId).toBeUndefined()
    expect(firstArg.milestoneId).toBeUndefined()

    await cleanup()
  })

  it('tC-11: use case returns error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new ValidationError('filter', 'Invalid')))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'search_issues',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('VALIDATION_ERROR')

    await cleanup()
  })

  it('tC-12: empty result set', async () => {
    const paginatedResult = createPaginatedResult([], { total: 0 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedResult))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'search_issues',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items).toEqual([])

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// get_issue
// ---------------------------------------------------------------------------
describe('get_issue', () => {
  it('tC-13: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerGetIssueTool(server, registry, deps)).not.toThrow()
  })

  it('tC-14: tagged with shared', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerGetIssueTool(server, registry, deps)

    expect(registry.getTagsForTool('get_issue').has('shared')).toBe(true)
  })

  it('tC-15: success: delegates to issueRepository.getById', async () => {
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

  it('tC-16: response contains full issue fields', async () => {
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

    const parsed = parseTextContent(result)
    expect(parsed.id).toBeDefined()
    expect(parsed.title).toBeDefined()
    expect(parsed.state).toBeDefined()
    expect(parsed.status).toBeDefined()
    expect(parsed.priority).toBeDefined()
    expect(parsed.assigneeIds).toBeDefined()
    expect(parsed.tags).toBeDefined()
    expect(parsed.createdAt).toBeDefined()
    expect(parsed.updatedAt).toBeDefined()

    await cleanup()
  })

  it('tC-17: getById throws NotFoundError', async () => {
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

  it('tC-18: getById throws unknown error', async () => {
    const deps = createMockDependencies()
    const getByIdMock = vi.fn().mockRejectedValue(new Error('DB fail'))
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
    const text = (result.content as Array<{ type: string, text: string }>)[0]!.text
    expect(text).toContain('Internal error')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// list_milestones
// ---------------------------------------------------------------------------
describe('list_milestones', () => {
  it('tC-19: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerListMilestonesTool(server, registry, deps)).not.toThrow()
  })

  it('tC-20: tagged with shared', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerListMilestonesTool(server, registry, deps)

    expect(registry.getTagsForTool('list_milestones').has('shared')).toBe(true)
  })

  it('tC-21: success: delegates to listMilestones.execute', async () => {
    const ms1 = createMockMilestone({ id: VALID_MILESTONE_ID, name: 'Milestone 1' })
    const ms2 = createMockMilestone({ id: 'a0000000-0000-0000-0000-000000000002', name: 'Milestone 2' })
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

  it('tC-22: default pagination page=1 limit=20', async () => {
    const paginatedResult = createPaginatedResult([])

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedResult))
    deps.listMilestones = { execute: executeMock } as unknown as McpServerDependencies['listMilestones']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'list_milestones',
      arguments: {},
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledWith({ page: 1, limit: 20 })

    await cleanup()
  })

  it('tC-23: custom pagination', async () => {
    const paginatedResult = createPaginatedResult([], { page: 2, limit: 10 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedResult))
    deps.listMilestones = { execute: executeMock } as unknown as McpServerDependencies['listMilestones']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'list_milestones',
      arguments: { page: 2, limit: 10 },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledWith({ page: 2, limit: 10 })

    await cleanup()
  })

  it('tC-24: empty result', async () => {
    const paginatedResult = { items: [], total: 0, page: 1, limit: 20, hasMore: false }

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

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items).toEqual([])

    await cleanup()
  })

  it('tC-25: response contains paginated structure', async () => {
    const ms = createMockMilestone()
    const paginatedResult = createPaginatedResult([ms], { total: 1, hasMore: false })

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

    const parsed = parseTextContent(result)
    expect(parsed.items).toBeDefined()
    expect(parsed.total).toBeDefined()
    expect(parsed.page).toBeDefined()
    expect(parsed.limit).toBeDefined()
    expect(parsed.hasMore).toBeDefined()

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// create_issue
// ---------------------------------------------------------------------------
describe('create_issue', () => {
  it('cI-01: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerCreateIssueTool(server, registry, deps)).not.toThrow()
  })

  it('cI-02: tagged with shared', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerCreateIssueTool(server, registry, deps)

    expect(registry.getTagsForTool('create_issue').has('shared')).toBe(true)
  })

  it('cI-03: tool listed by MCP client', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const listResult = await client.listTools()
    const toolNames = listResult.tools.map(t => t.name)

    expect(toolNames).toContain('create_issue')

    await cleanup()
  })

  it('cI-04: success: title only (minimal)', async () => {
    const mockIssue = createMockIssue({ title: 'My Issue' })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue' },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledOnce()
    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.title).toBe('My Issue')
    const secondArg = executeMock.mock.calls[0]![1]
    expect(secondArg).toBe(SYSTEM_USER_ID)
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.id).toBeDefined()

    await cleanup()
  })

  it('cI-05: passes optional description', async () => {
    const mockIssue = createMockIssue({ description: 'Details' })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue', description: 'Details' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.description).toBe('Details')

    await cleanup()
  })

  it('cI-06: passes milestoneId', async () => {
    const mockIssue = createMockIssue()
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue', milestoneId: VALID_MILESTONE_ID },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.milestoneId).toBe(VALID_MILESTONE_ID)

    await cleanup()
  })

  it('cI-07: milestoneId defaults to null when omitted', async () => {
    const mockIssue = createMockIssue()
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.milestoneId).toBeNull()

    await cleanup()
  })

  it('cI-08: passes state', async () => {
    const mockIssue = createMockIssue({ state: 'in_progress' })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue', state: 'in_progress' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.state).toBe('in_progress')

    await cleanup()
  })

  it('cI-09: passes status', async () => {
    const mockIssue = createMockIssue({ status: 'in_review' })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue', status: 'in_review' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.status).toBe('in_review')

    await cleanup()
  })

  it('cI-10: passes priority', async () => {
    const mockIssue = createMockIssue({ priority: 'urgent' })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue', priority: 'urgent' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.priority).toBe('urgent')

    await cleanup()
  })

  it('cI-11: passes parentId', async () => {
    const mockIssue = createMockIssue({ parentId: VALID_ISSUE_ID })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue', parentId: VALID_ISSUE_ID },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.parentId).toBe(VALID_ISSUE_ID)

    await cleanup()
  })

  it('cI-12: parentId defaults to null when omitted', async () => {
    const mockIssue = createMockIssue()
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.parentId).toBeNull()

    await cleanup()
  })

  it('cI-13: passes assigneeIds', async () => {
    const mockIssue = createMockIssue({ assigneeIds: [VALID_USER_ID] })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue', assigneeIds: [VALID_USER_ID] },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.assigneeIds).toEqual([VALID_USER_ID])

    await cleanup()
  })

  it('cI-14: passes tags', async () => {
    const inputTags = [{ id: VALID_TAG_ID, name: 'bug', color: '#ff0000' }]
    const mockIssue = createMockIssue({ tags: [{ id: 't1', name: 'bug', color: '#ff0000' }] })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue', tags: inputTags },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.tags).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: VALID_TAG_ID, name: 'bug', color: '#ff0000' }),
    ]))

    await cleanup()
  })

  it('cI-15: passes dueDate as ISO string, converted to Date', async () => {
    const mockIssue = createMockIssue({ dueDate: '2026-03-01T00:00:00.000Z' })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue', dueDate: '2026-03-01T00:00:00.000Z' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.dueDate).toBeInstanceOf(Date)

    await cleanup()
  })

  it('cI-16: dueDate omitted passes undefined', async () => {
    const mockIssue = createMockIssue()
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.dueDate).toBeUndefined()

    await cleanup()
  })

  it('cI-17: passes metadata', async () => {
    const mockIssue = createMockIssue({ metadata: { sprint: 5 } })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue', metadata: { sprint: 5 } },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.metadata).toEqual({ sprint: 5 })

    await cleanup()
  })

  it('cI-18: response contains full issue fields', async () => {
    const mockIssue = createMockIssue({
      title: 'Full Issue',
      state: 'open',
      status: 'backlog',
      priority: 'normal',
      assigneeIds: [VALID_USER_ID],
      tags: [{ id: 't1', name: 'bug', color: '#ff0000' }],
    })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: 'Full Issue' },
    }) as CallToolResult

    const parsed = parseTextContent(result)
    expect(parsed.id).toBeDefined()
    expect(parsed.title).toBeDefined()
    expect(parsed.state).toBeDefined()
    expect(parsed.status).toBeDefined()
    expect(parsed.priority).toBeDefined()
    expect(parsed.assigneeIds).toBeDefined()
    expect(parsed.tags).toBeDefined()
    expect(parsed.createdAt).toBeDefined()
    expect(parsed.updatedAt).toBeDefined()

    await cleanup()
  })

  it('cI-19: use case returns validation error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new ValidationError('title', 'Invalid')))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('VALIDATION_ERROR')

    await cleanup()
  })

  it('cI-20: use case returns conflict error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new ConflictError('Issue', VALID_ISSUE_ID, 'duplicate')))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('CONFLICT')

    await cleanup()
  })

  it('cI-21: use case throws unexpected error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockRejectedValue(new Error('DB fail'))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: 'My Issue' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const text = (result.content as Array<{ type: string, text: string }>)[0]!.text
    expect(text).toContain('Internal error')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// Server integration (shared tools)
// ---------------------------------------------------------------------------
describe('server integration (shared tools)', () => {
  async function listToolNames(server: McpServer): Promise<string[]> {
    const { client, cleanup } = await connectClientToServer(server)
    const listResult = await client.listTools()
    const names = listResult.tools.map(t => t.name)
    await cleanup()
    return names
  }

  const SHARED_TOOL_NAMES = ['search_issues', 'get_issue', 'list_milestones', 'create_issue']
  const PM_TOOL_NAMES = ['create_epic', 'create_milestone', 'view_roadmap', 'assign_priority', 'list_pm_milestones', 'milestone_overview', 'reparent_issue', 'delete_issue']
  const DEV_TOOL_NAMES = ['pick_next_task', 'update_status', 'view_issue_detail', 'list_my_issues', 'add_comment', 'update_comment', 'delete_comment', 'list_issue_comments']

  it('cI-22: create_issue visible when no tag filter', async () => {
    const server = createMcpServer(createMockDependencies())

    const toolNames = await listToolNames(server)

    expect(toolNames).toContain('create_issue')
  })

  it('cI-23: create_issue visible with includeTags=pm', async () => {
    const server = createMcpServer(createMockDependencies(), {
      includeTags: new Set(['pm']),
    })

    const toolNames = await listToolNames(server)

    expect(toolNames).toContain('create_issue')
  })

  it('cI-24: create_issue visible with includeTags=dev', async () => {
    const server = createMcpServer(createMockDependencies(), {
      includeTags: new Set(['dev']),
    })

    const toolNames = await listToolNames(server)

    expect(toolNames).toContain('create_issue')
  })

  it('cI-25: create_issue hidden with excludeTags=shared', async () => {
    const server = createMcpServer(createMockDependencies(), {
      excludeTags: new Set(['shared']),
    })

    const toolNames = await listToolNames(server)

    expect(toolNames).not.toContain('create_issue')
  })

  it('tC-26: shared tools visible when no tag filter', async () => {
    const server = createMcpServer(createMockDependencies())

    const toolNames = await listToolNames(server)

    for (const name of SHARED_TOOL_NAMES) {
      expect(toolNames).toContain(name)
    }
  })

  it('tC-27: shared tools visible with includeTags=pm', async () => {
    const server = createMcpServer(createMockDependencies(), {
      includeTags: new Set(['pm']),
    })

    const toolNames = await listToolNames(server)

    for (const name of SHARED_TOOL_NAMES) {
      expect(toolNames).toContain(name)
    }
  })

  it('tC-28: shared tools visible with includeTags=dev', async () => {
    const server = createMcpServer(createMockDependencies(), {
      includeTags: new Set(['dev']),
    })

    const toolNames = await listToolNames(server)

    for (const name of SHARED_TOOL_NAMES) {
      expect(toolNames).toContain(name)
    }
  })

  it('tC-29: shared tools hidden with excludeTags=shared', async () => {
    const server = createMcpServer(createMockDependencies(), {
      excludeTags: new Set(['shared']),
    })

    const toolNames = await listToolNames(server)

    for (const name of SHARED_TOOL_NAMES) {
      expect(toolNames).not.toContain(name)
    }
  })

  it('tC-30: shared + pm tools visible with includeTags=pm', async () => {
    const server = createMcpServer(createMockDependencies(), {
      includeTags: new Set(['pm']),
    })

    const toolNames = await listToolNames(server)

    for (const name of SHARED_TOOL_NAMES) {
      expect(toolNames).toContain(name)
    }
    for (const name of PM_TOOL_NAMES) {
      expect(toolNames).toContain(name)
    }
  })

  it('tC-31: pm tools hidden when includeTags=dev', async () => {
    const server = createMcpServer(createMockDependencies(), {
      includeTags: new Set(['dev']),
    })

    const toolNames = await listToolNames(server)

    for (const name of PM_TOOL_NAMES) {
      expect(toolNames).not.toContain(name)
    }
    for (const name of SHARED_TOOL_NAMES) {
      expect(toolNames).toContain(name)
    }
    for (const name of DEV_TOOL_NAMES) {
      expect(toolNames).toContain(name)
    }
  })
})

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------
describe('edge cases', () => {
  it('tC-32: search_issues: invalid state value', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'search_issues',
      arguments: { state: 'deleted' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-33: search_issues: invalid priority value', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'search_issues',
      arguments: { priority: 'critical' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-34: search_issues: invalid assigneeId (not UUID)', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'search_issues',
      arguments: { assigneeId: 'not-uuid' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-35: search_issues: invalid milestoneId (not UUID)', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'search_issues',
      arguments: { milestoneId: 'bad' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-36: search_issues: limit exceeds max 100', async () => {
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

  it('tC-37: search_issues: page 0 (non-positive)', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'search_issues',
      arguments: { page: 0 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-38: get_issue: missing issueId', async () => {
    const deps = createMockDependencies()
    const getByIdMock = vi.fn()
    deps.issueRepository = { getById: getByIdMock } as unknown as McpServerDependencies['issueRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerGetIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'get_issue',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(getByIdMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-39: get_issue: invalid issueId (not UUID)', async () => {
    const deps = createMockDependencies()
    const getByIdMock = vi.fn()
    deps.issueRepository = { getById: getByIdMock } as unknown as McpServerDependencies['issueRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerGetIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'get_issue',
      arguments: { issueId: 'bad' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(getByIdMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-40: list_milestones: limit exceeds max 100', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listMilestones = { execute: executeMock } as unknown as McpServerDependencies['listMilestones']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_milestones',
      arguments: { limit: 101 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-41: list_milestones: page 0 (non-positive)', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listMilestones = { execute: executeMock } as unknown as McpServerDependencies['listMilestones']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_milestones',
      arguments: { page: 0 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-42: list_milestones: use case throws error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockRejectedValue(new Error('DB crash'))
    deps.listMilestones = { execute: executeMock } as unknown as McpServerDependencies['listMilestones']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_milestones',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const text = (result.content as Array<{ type: string, text: string }>)[0]!.text
    expect(text).toContain('Internal error')

    await cleanup()
  })

  it('tC-43: search_issues: handler exception caught', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockRejectedValue(new Error('crash'))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'search_issues',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const text = (result.content as Array<{ type: string, text: string }>)[0]!.text
    expect(text).toContain('Internal error')

    await cleanup()
  })

  // create_issue edge cases
  it('cI-26: empty title rejected by Zod before use case', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: '' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('cI-27: missing title rejected by Zod', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('cI-28: title at max 500 chars accepted', async () => {
    const mockIssue = createMockIssue({ title: 'a'.repeat(500) })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: 'a'.repeat(500) },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()

    await cleanup()
  })

  it('cI-29: title exceeding 500 chars rejected', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: 'a'.repeat(501) },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('cI-30: invalid milestoneId (not UUID) rejected', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: 'X', milestoneId: 'not-uuid' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('cI-31: invalid parentId (not UUID) rejected', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: 'X', parentId: 'bad' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('cI-32: invalid state value rejected', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: 'X', state: 'deleted' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('cI-33: invalid priority value rejected', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: 'X', priority: 'critical' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('cI-34: invalid assigneeId in array rejected', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: 'X', assigneeIds: ['not-uuid'] },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('cI-35: invalid dueDate (not ISO 8601) rejected', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_issue',
      arguments: { title: 'X', dueDate: 'next-week' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('cI-36: null milestoneId accepted', async () => {
    const mockIssue = createMockIssue()
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'X', milestoneId: null },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalled()
    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.milestoneId).toBeNull()

    await cleanup()
  })

  it('cI-37: null parentId accepted', async () => {
    const mockIssue = createMockIssue()
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'X', parentId: null },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalled()
    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.parentId).toBeNull()

    await cleanup()
  })

  it('cI-38: null dueDate accepted', async () => {
    const mockIssue = createMockIssue()
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateIssueTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_issue',
      arguments: { title: 'X', dueDate: null },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalled()
    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.dueDate).toBeNull()

    await cleanup()
  })
})
