import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpServerDependencies } from '../src/types.js'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it, vi } from 'vitest'

import { ToolTagRegistry } from '../src/helpers/tool-tag-registry.js'
import { registerUpdateStatusTool } from '../src/tools/dev/update-status.js'
import { registerCreateEpicTool } from '../src/tools/pm/create-epic.js'

const VALID_MILESTONE_ID = 'a0000000-0000-0000-0000-000000000001'
const VALID_ISSUE_ID = 'b0000000-0000-0000-0000-000000000001'
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

function okResult<T>(value: T) {
  return { ok: true as const, value }
}

function createMockDependencies(overrides?: Partial<McpServerDependencies>): McpServerDependencies {
  return {
    createIssue: { execute: vi.fn() } as unknown as McpServerDependencies['createIssue'],
    createMilestone: { execute: vi.fn() } as unknown as McpServerDependencies['createMilestone'],
    updateIssue: { execute: vi.fn() } as unknown as McpServerDependencies['updateIssue'],
    getMilestoneOverview: { execute: vi.fn() } as unknown as McpServerDependencies['getMilestoneOverview'],
    milestoneRepository: { list: vi.fn() } as unknown as McpServerDependencies['milestoneRepository'],
    listIssues: { execute: vi.fn() } as unknown as McpServerDependencies['listIssues'],
    updateState: { execute: vi.fn() } as unknown as McpServerDependencies['updateState'],
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

// ---------------------------------------------------------------------------
// MCP create_epic Tool
// ---------------------------------------------------------------------------
describe('pre-migration: MCP create_epic', () => {
  it('mT-01: create_epic has title as required in input schema', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createIssue = { execute: executeMock } as unknown as McpServerDependencies['createIssue']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const listResult = await client.listTools()
    const epicTool = listResult.tools.find(t => t.name === 'create_epic')

    expect(epicTool).toBeDefined()
    // The input schema should have title as a required property
    const schema = epicTool!.inputSchema as Record<string, unknown>
    const required = schema.required as string[]
    expect(required).toContain('title')

    await cleanup()
  })

  it('mT-02: create_epic has parentId optional field', async () => {
    const deps = createMockDependencies()
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateEpicTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const listResult = await client.listTools()
    const epicTool = listResult.tools.find(t => t.name === 'create_epic')

    expect(epicTool).toBeDefined()
    const schema = epicTool!.inputSchema as Record<string, unknown>
    const properties = schema.properties as Record<string, unknown>
    expect(properties.parentId).toBeDefined()
    // Should not be required
    const required = schema.required as string[]
    expect(required).not.toContain('parentId')

    await cleanup()
  })

  it('mT-03: create_epic builds metadata with type:epic', async () => {
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

    expect(executeMock).toHaveBeenCalledOnce()
    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.metadata.type).toBe('epic')

    await cleanup()
  })

  it('mT-04: create_epic passes parentId to use case', async () => {
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
})

// ---------------------------------------------------------------------------
// MCP update_status Tool
// ---------------------------------------------------------------------------
describe('pre-migration: MCP update_status', () => {
  it('mT-05: tool name is update_status', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerUpdateStatusTool(server, registry, deps)).not.toThrow()
    // Verify registration by checking the registry has the tool tagged
    expect(registry.getTagsForTool('update_status').has('dev')).toBe(true)
  })

  it('mT-06: input schema uses StateSchema (open/in_progress/done)', async () => {
    const deps = createMockDependencies()
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerUpdateStatusTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const listResult = await client.listTools()
    const statusTool = listResult.tools.find(t => t.name === 'update_status')

    expect(statusTool).toBeDefined()
    const schema = statusTool!.inputSchema as Record<string, unknown>
    const properties = schema.properties as Record<string, unknown>
    const stateProp = properties.state as Record<string, unknown>
    // The state enum should contain exactly our 3 values
    const enumValues = stateProp.enum as string[]
    expect(enumValues).toContain('open')
    expect(enumValues).toContain('in_progress')
    expect(enumValues).toContain('done')

    await cleanup()
  })

  it('mT-07: calls dependencies.updateState.execute', async () => {
    const mockIssue = createMockIssue({ state: 'in_progress' })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.updateState = { execute: executeMock } as unknown as McpServerDependencies['updateState']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerUpdateStatusTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'update_status',
      arguments: { issueId: VALID_ISSUE_ID, state: 'in_progress' },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledWith(VALID_ISSUE_ID, 'in_progress', SYSTEM_USER_ID)

    await cleanup()
  })
})
