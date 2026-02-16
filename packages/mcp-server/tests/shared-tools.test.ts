import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpServerDependencies } from '../src/types.js'

import { NotFoundError, ValidationError } from '@meridian/core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it, vi } from 'vitest'

import { ToolTagRegistry } from '../src/helpers/tool-tag-registry.js'
import { createMcpServer } from '../src/server.js'
import { registerGetIssueTool } from '../src/tools/shared/get-issue.js'
import { registerSharedTools } from '../src/tools/shared/index.js'
import { registerListProjectsTool } from '../src/tools/shared/list-projects.js'
import { registerSearchIssuesTool } from '../src/tools/shared/search-issues.js'

const VALID_PROJECT_ID = 'a0000000-0000-0000-0000-000000000001'
const VALID_ISSUE_ID = 'b0000000-0000-0000-0000-000000000001'
const VALID_USER_ID = 'c0000000-0000-0000-0000-000000000001'

function okResult<T>(value: T) {
  return { ok: true as const, value }
}

function errResult(error: { code: string, message: string }) {
  return { ok: false as const, error }
}

function createMockDependencies(overrides?: Partial<McpServerDependencies>): McpServerDependencies {
  return {
    createIssue: { execute: vi.fn() } as unknown as McpServerDependencies['createIssue'],
    updateIssue: { execute: vi.fn() } as unknown as McpServerDependencies['updateIssue'],
    getProjectOverview: { execute: vi.fn() } as unknown as McpServerDependencies['getProjectOverview'],
    projectRepository: { list: vi.fn() } as unknown as McpServerDependencies['projectRepository'],
    listIssues: { execute: vi.fn() } as unknown as McpServerDependencies['listIssues'],
    updateStatus: { execute: vi.fn() } as unknown as McpServerDependencies['updateStatus'],
    assignIssue: { execute: vi.fn() } as unknown as McpServerDependencies['assignIssue'],
    issueRepository: { getById: vi.fn() } as unknown as McpServerDependencies['issueRepository'],
    commentRepository: { create: vi.fn(), getByIssueId: vi.fn() } as unknown as McpServerDependencies['commentRepository'],
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
    projectId: VALID_PROJECT_ID,
    title: 'Test Issue',
    description: '',
    status: 'open',
    priority: 'normal',
    assigneeIds: [],
    tags: [],
    dueDate: null,
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function createMockProject(overrides?: Record<string, unknown>) {
  return {
    id: VALID_PROJECT_ID,
    name: 'Test Project',
    description: '',
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
  it('tC-01: registers all 3 shared tools', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    const result = registerSharedTools(server, registry, deps)

    expect(result.has('search_issues')).toBe(true)
    expect(result.has('get_issue')).toBe(true)
    expect(result.has('list_projects')).toBe(true)
    expect(result.size).toBe(3)
  })

  it('tC-02: all 3 tools tagged with shared', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerSharedTools(server, registry, deps)

    const toolNames = ['search_issues', 'get_issue', 'list_projects']
    for (const name of toolNames) {
      expect(registry.getTagsForTool(name).has('shared')).toBe(true)
    }
  })

  it('tC-03: tools listable by MCP client', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerSharedTools(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const listResult = await client.listTools()
    const toolNames = listResult.tools.map(t => t.name)

    expect(toolNames).toContain('search_issues')
    expect(toolNames).toContain('get_issue')
    expect(toolNames).toContain('list_projects')

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
      arguments: { status: 'open', priority: 'high', assigneeId: VALID_USER_ID, projectId: VALID_PROJECT_ID, search: 'bug' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.status).toBe('open')
    expect(firstArg.priority).toBe('high')
    expect(firstArg.assigneeId).toBe(VALID_USER_ID)
    expect(firstArg.projectId).toBe(VALID_PROJECT_ID)
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
    expect(firstArg.status).toBeUndefined()
    expect(firstArg.priority).toBeUndefined()
    expect(firstArg.assigneeId).toBeUndefined()
    expect(firstArg.projectId).toBeUndefined()

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
// list_projects
// ---------------------------------------------------------------------------
describe('list_projects', () => {
  it('tC-19: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerListProjectsTool(server, registry, deps)).not.toThrow()
  })

  it('tC-20: tagged with shared', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerListProjectsTool(server, registry, deps)

    expect(registry.getTagsForTool('list_projects').has('shared')).toBe(true)
  })

  it('tC-21: success: delegates to projectRepository.list', async () => {
    const proj1 = createMockProject({ id: VALID_PROJECT_ID, name: 'Project 1' })
    const proj2 = createMockProject({ id: 'a0000000-0000-0000-0000-000000000002', name: 'Project 2' })
    const paginatedResult = createPaginatedResult([proj1, proj2])

    const deps = createMockDependencies()
    const listMock = vi.fn().mockResolvedValue(paginatedResult)
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListProjectsTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_projects',
      arguments: {},
    }) as CallToolResult

    expect(listMock).toHaveBeenCalledWith({ page: 1, limit: 20 })
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items).toHaveLength(2)

    await cleanup()
  })

  it('tC-22: default pagination page=1 limit=20', async () => {
    const paginatedResult = createPaginatedResult([])

    const deps = createMockDependencies()
    const listMock = vi.fn().mockResolvedValue(paginatedResult)
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListProjectsTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'list_projects',
      arguments: {},
    }) as CallToolResult

    expect(listMock).toHaveBeenCalledWith({ page: 1, limit: 20 })

    await cleanup()
  })

  it('tC-23: custom pagination', async () => {
    const paginatedResult = createPaginatedResult([], { page: 2, limit: 10 })

    const deps = createMockDependencies()
    const listMock = vi.fn().mockResolvedValue(paginatedResult)
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListProjectsTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'list_projects',
      arguments: { page: 2, limit: 10 },
    }) as CallToolResult

    expect(listMock).toHaveBeenCalledWith({ page: 2, limit: 10 })

    await cleanup()
  })

  it('tC-24: empty result', async () => {
    const paginatedResult = { items: [], total: 0, page: 1, limit: 20, hasMore: false }

    const deps = createMockDependencies()
    const listMock = vi.fn().mockResolvedValue(paginatedResult)
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListProjectsTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_projects',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items).toEqual([])

    await cleanup()
  })

  it('tC-25: response contains paginated structure', async () => {
    const proj = createMockProject()
    const paginatedResult = createPaginatedResult([proj], { total: 1, hasMore: false })

    const deps = createMockDependencies()
    const listMock = vi.fn().mockResolvedValue(paginatedResult)
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListProjectsTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_projects',
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

  const SHARED_TOOL_NAMES = ['search_issues', 'get_issue', 'list_projects']
  const PM_TOOL_NAMES = ['create_epic', 'view_roadmap', 'assign_priority', 'list_milestones', 'project_overview']
  const DEV_TOOL_NAMES = ['pick_next_task', 'update_status', 'view_issue_detail', 'list_my_issues', 'add_comment']

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
  it('tC-32: search_issues: invalid status value', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'search_issues',
      arguments: { status: 'deleted' },
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

  it('tC-35: search_issues: invalid projectId (not UUID)', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerSearchIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'search_issues',
      arguments: { projectId: 'bad' },
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

  it('tC-40: list_projects: limit exceeds max 100', async () => {
    const deps = createMockDependencies()
    const listMock = vi.fn()
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListProjectsTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_projects',
      arguments: { limit: 101 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(listMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-41: list_projects: page 0 (non-positive)', async () => {
    const deps = createMockDependencies()
    const listMock = vi.fn()
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListProjectsTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_projects',
      arguments: { page: 0 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(listMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-42: list_projects: repository throws error', async () => {
    const deps = createMockDependencies()
    const listMock = vi.fn().mockRejectedValue(new Error('DB crash'))
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListProjectsTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_projects',
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
})
