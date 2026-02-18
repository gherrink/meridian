import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpServerDependencies } from '../src/types.js'

import { ConflictError, ValidationError } from '@meridian/core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it, vi } from 'vitest'

import { ToolTagRegistry } from '../src/helpers/tool-tag-registry.js'
import { registerCreateMilestoneTool } from '../src/tools/pm/create-milestone.js'
import { registerPmTools } from '../src/tools/pm/index.js'

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
    milestoneRepository: { list: vi.fn() } as unknown as McpServerDependencies['milestoneRepository'],
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

function createMockMilestone(overrides?: Record<string, unknown>) {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Test Milestone',
    description: '',
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// create_milestone tool
// ---------------------------------------------------------------------------
describe('create_milestone', () => {
  it('mP-01: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerCreateMilestoneTool(server, registry, deps)).not.toThrow()
  })

  it('mP-02: tagged with pm', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerCreateMilestoneTool(server, registry, deps)

    expect(registry.getTagsForTool('create_milestone').has('pm')).toBe(true)
  })

  it('mP-03: tool listed by MCP client', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerCreateMilestoneTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const listResult = await client.listTools()
    const toolNames = listResult.tools.map(t => t.name)

    expect(toolNames).toContain('create_milestone')

    await cleanup()
  })

  it('mP-04: success: delegates to createMilestone use-case', async () => {
    const mockMilestone = createMockMilestone()
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockMilestone))
    deps.createMilestone = { execute: executeMock } as unknown as McpServerDependencies['createMilestone']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateMilestoneTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_milestone',
      arguments: { name: 'Test Milestone' },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledOnce()
    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.name).toBe('Test Milestone')
    expect(executeMock.mock.calls[0]![1]).toBe(SYSTEM_USER_ID)
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.id).toBeDefined()

    await cleanup()
  })

  it('mP-05: passes optional description', async () => {
    const mockMilestone = createMockMilestone({ description: 'D' })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockMilestone))
    deps.createMilestone = { execute: executeMock } as unknown as McpServerDependencies['createMilestone']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateMilestoneTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_milestone',
      arguments: { name: 'P', description: 'D' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.description).toBe('D')

    await cleanup()
  })

  it('mP-06: passes optional metadata', async () => {
    const mockMilestone = createMockMilestone({ metadata: { k: 'v' } })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockMilestone))
    deps.createMilestone = { execute: executeMock } as unknown as McpServerDependencies['createMilestone']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateMilestoneTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_milestone',
      arguments: { name: 'P', metadata: { k: 'v' } },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.metadata).toEqual({ k: 'v' })

    await cleanup()
  })

  it('mP-07: validation error from use-case', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new ValidationError('name', 'Required')))
    deps.createMilestone = { execute: executeMock } as unknown as McpServerDependencies['createMilestone']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateMilestoneTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_milestone',
      arguments: { name: 'X' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('VALIDATION_ERROR')

    await cleanup()
  })

  it('mP-08: conflict error from use-case', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new ConflictError('Milestone', 'x', 'duplicate')))
    deps.createMilestone = { execute: executeMock } as unknown as McpServerDependencies['createMilestone']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateMilestoneTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_milestone',
      arguments: { name: 'X' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('CONFLICT')

    await cleanup()
  })

  it('mP-09: empty name rejected by Zod before use-case', async () => {
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

  it('mP-10: missing name rejected by Zod', async () => {
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

  // Edge case
  it('eP-05: name at max 200 chars accepted', async () => {
    const mockMilestone = createMockMilestone({ name: 'a'.repeat(200) })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockMilestone))
    deps.createMilestone = { execute: executeMock } as unknown as McpServerDependencies['createMilestone']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateMilestoneTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_milestone',
      arguments: { name: 'a'.repeat(200) },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// Wiring (registerPmTools index barrel)
// ---------------------------------------------------------------------------
describe('registerPmTools wiring for create_milestone', () => {
  it('wP-01: registerPmTools includes create_milestone', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    const result = registerPmTools(server, registry, deps)

    expect(result.has('create_milestone')).toBe(true)
  })

  it('wP-02: create_milestone tagged with pm via registerPmTools', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerPmTools(server, registry, deps)

    expect(registry.getTagsForTool('create_milestone').has('pm')).toBe(true)
  })
})
