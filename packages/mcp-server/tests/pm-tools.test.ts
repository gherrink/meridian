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
import { registerListMilestonesTool } from '../src/tools/pm/list-milestones.js'
import { registerProjectOverviewTool } from '../src/tools/pm/project-overview.js'
import { registerViewRoadmapTool } from '../src/tools/pm/view-roadmap.js'

const VALID_PROJECT_ID = 'a0000000-0000-0000-0000-000000000001'
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
    updateIssue: { execute: vi.fn() } as unknown as McpServerDependencies['updateIssue'],
    getProjectOverview: { execute: vi.fn() } as unknown as McpServerDependencies['getProjectOverview'],
    projectRepository: { list: vi.fn() } as unknown as McpServerDependencies['projectRepository'],
    listIssues: {} as McpServerDependencies['listIssues'],
    updateStatus: {} as McpServerDependencies['updateStatus'],
    assignIssue: {} as McpServerDependencies['assignIssue'],
    issueRepository: {} as McpServerDependencies['issueRepository'],
    commentRepository: {} as McpServerDependencies['commentRepository'],
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
    title: 'My Epic',
    description: '',
    status: 'open',
    priority: 'normal',
    assigneeIds: [],
    tags: [],
    dueDate: null,
    metadata: { type: 'epic' },
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

function createMockOverview(overrides?: Record<string, unknown>) {
  return {
    project: createMockProject(),
    totalIssues: 5,
    statusBreakdown: { open: 3, in_progress: 1, closed: 1 },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// registerPmTools (index barrel)
// ---------------------------------------------------------------------------
describe('registerPmTools', () => {
  it('tC-01: registers all 5 PM tools', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    const result = registerPmTools(server, registry, deps)

    expect(result.has('create_epic')).toBe(true)
    expect(result.has('view_roadmap')).toBe(true)
    expect(result.has('assign_priority')).toBe(true)
    expect(result.has('list_milestones')).toBe(true)
    expect(result.has('project_overview')).toBe(true)
  })

  it('tC-02: all 5 tools tagged with pm', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerPmTools(server, registry, deps)

    const toolNames = ['create_epic', 'view_roadmap', 'assign_priority', 'list_milestones', 'project_overview']
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
    expect(toolNames).toContain('view_roadmap')
    expect(toolNames).toContain('assign_priority')
    expect(toolNames).toContain('list_milestones')
    expect(toolNames).toContain('project_overview')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// create_epic
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
      arguments: { projectId: VALID_PROJECT_ID, title: 'My Epic' },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledOnce()
    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.projectId).toBe(VALID_PROJECT_ID)
    expect(firstArg.title).toBe('My Epic')
    expect(firstArg.metadata.type).toBe('epic')
    expect(executeMock.mock.calls[0]![1]).toBe(SYSTEM_USER_ID)
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.id).toBe(VALID_ISSUE_ID)

    await cleanup()
  })

  it('tC-07: success with childIssueIds', async () => {
    const mockIssue = createMockIssue({ metadata: { type: 'epic', childIssueIds: [VALID_ISSUE_ID] } })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_epic',
      arguments: { projectId: VALID_PROJECT_ID, title: 'My Epic', childIssueIds: [VALID_ISSUE_ID] },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.metadata.childIssueIds).toEqual([VALID_ISSUE_ID])

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
      arguments: { projectId: VALID_PROJECT_ID, title: 'My Epic', description: 'Scope text' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.description).toBe('Scope text')

    await cleanup()
  })

  it('tC-09: success without childIssueIds', async () => {
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
      arguments: { projectId: VALID_PROJECT_ID, title: 'My Epic' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.metadata.type).toBe('epic')
    expect(firstArg.metadata.childIssueIds).toBeUndefined()

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
      arguments: { projectId: VALID_PROJECT_ID, title: 'X' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('VALIDATION_ERROR')

    await cleanup()
  })

  it('tC-11: use case returns not-found error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new NotFoundError('Project', VALID_PROJECT_ID)))
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_epic',
      arguments: { projectId: VALID_PROJECT_ID, title: 'X' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// view_roadmap
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

  it('tC-14: success: delegates to getProjectOverview', async () => {
    const overview = createMockOverview({ totalIssues: 5 })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(overview))
    deps.getProjectOverview = { execute: executeMock } as unknown as McpServerDependencies['getProjectOverview']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerViewRoadmapTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'view_roadmap',
      arguments: { projectId: VALID_PROJECT_ID },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledWith(VALID_PROJECT_ID)
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.totalIssues).toBe(5)

    await cleanup()
  })

  it('tC-15: not-found error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new NotFoundError('Project', VALID_PROJECT_ID)))
    deps.getProjectOverview = { execute: executeMock } as unknown as McpServerDependencies['getProjectOverview']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerViewRoadmapTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'view_roadmap',
      arguments: { projectId: VALID_PROJECT_ID },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// assign_priority
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
// list_milestones
// ---------------------------------------------------------------------------
describe('list_milestones', () => {
  it('tC-22: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerListMilestonesTool(server, registry, deps)).not.toThrow()
  })

  it('tC-23: tagged with pm', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerListMilestonesTool(server, registry, deps)

    expect(registry.getTagsForTool('list_milestones').has('pm')).toBe(true)
  })

  it('tC-24: success: delegates to projectRepository.list', async () => {
    const proj1 = createMockProject({ id: VALID_PROJECT_ID, name: 'Project 1' })
    const proj2 = createMockProject({ id: 'a0000000-0000-0000-0000-000000000002', name: 'Project 2' })
    const paginatedResult = { items: [proj1, proj2], total: 2, page: 1, limit: 20, hasMore: false }
    const deps = createMockDependencies()
    const listMock = vi.fn().mockResolvedValue(paginatedResult)
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_milestones',
      arguments: {},
    }) as CallToolResult

    expect(listMock).toHaveBeenCalledWith({ page: 1, limit: 20 })
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.items).toHaveLength(2)

    await cleanup()
  })

  it('tC-25: custom pagination', async () => {
    const paginatedResult = { items: [], total: 0, page: 2, limit: 10, hasMore: false }
    const deps = createMockDependencies()
    const listMock = vi.fn().mockResolvedValue(paginatedResult)
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'list_milestones',
      arguments: { page: 2, limit: 10 },
    }) as CallToolResult

    expect(listMock).toHaveBeenCalledWith({ page: 2, limit: 10 })

    await cleanup()
  })

  it('tC-26: uses formatSuccessResponse (not unwrapResult)', async () => {
    const paginatedResult = { items: [createMockProject()], total: 1, page: 1, limit: 20, hasMore: false }
    const deps = createMockDependencies()
    const listMock = vi.fn().mockResolvedValue(paginatedResult)
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

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
    expect(parsed.items).toBeDefined()
    expect(parsed.total).toBeDefined()

    await cleanup()
  })

  it('tC-27: empty result', async () => {
    const paginatedResult = { items: [], total: 0, page: 1, limit: 20, hasMore: false }
    const deps = createMockDependencies()
    const listMock = vi.fn().mockResolvedValue(paginatedResult)
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

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
})

// ---------------------------------------------------------------------------
// project_overview
// ---------------------------------------------------------------------------
describe('project_overview', () => {
  it('tC-28: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerProjectOverviewTool(server, registry, deps)).not.toThrow()
  })

  it('tC-29: tagged with pm', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerProjectOverviewTool(server, registry, deps)

    expect(registry.getTagsForTool('project_overview').has('pm')).toBe(true)
  })

  it('tC-30: success: delegates to getProjectOverview', async () => {
    const overview = createMockOverview({
      totalIssues: 10,
      statusBreakdown: { open: 5, in_progress: 3, closed: 2 },
    })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(overview))
    deps.getProjectOverview = { execute: executeMock } as unknown as McpServerDependencies['getProjectOverview']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerProjectOverviewTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'project_overview',
      arguments: { projectId: VALID_PROJECT_ID },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledWith(VALID_PROJECT_ID)
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.totalIssues).toBe(10)
    expect(parsed.statusBreakdown).toBeDefined()

    await cleanup()
  })

  it('tC-31: not-found error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new NotFoundError('Project', VALID_PROJECT_ID)))
    deps.getProjectOverview = { execute: executeMock } as unknown as McpServerDependencies['getProjectOverview']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerProjectOverviewTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'project_overview',
      arguments: { projectId: VALID_PROJECT_ID },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// Edge Cases
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
      arguments: { projectId: VALID_PROJECT_ID, title: '' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-33: create_epic: invalid projectId (not UUID)', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_epic',
      arguments: { projectId: 'not-a-uuid', title: 'X' },
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

  it('tC-36: view_roadmap: missing projectId', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.getProjectOverview = { execute: executeMock } as unknown as McpServerDependencies['getProjectOverview']

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

  it('tC-37: project_overview: missing projectId', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.getProjectOverview = { execute: executeMock } as unknown as McpServerDependencies['getProjectOverview']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerProjectOverviewTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'project_overview',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-38: list_milestones: limit exceeds max 50', async () => {
    const deps = createMockDependencies()
    const listMock = vi.fn()
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_milestones',
      arguments: { limit: 100 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(listMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-39: list_milestones: page 0 (non-positive)', async () => {
    const deps = createMockDependencies()
    const listMock = vi.fn()
    deps.projectRepository = { list: listMock } as unknown as McpServerDependencies['projectRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMilestonesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_milestones',
      arguments: { page: 0 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(listMock).not.toHaveBeenCalled()

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

  const PM_TOOL_NAMES = ['create_epic', 'view_roadmap', 'assign_priority', 'list_milestones', 'project_overview']

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
