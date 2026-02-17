import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpServerDependencies } from '../src/types.js'

import { ConflictError, ValidationError } from '@meridian/core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it, vi } from 'vitest'

import { ToolTagRegistry } from '../src/helpers/tool-tag-registry.js'
import { registerCreateProjectTool } from '../src/tools/pm/create-project.js'
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
    createProject: { execute: vi.fn() } as unknown as McpServerDependencies['createProject'],
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

function createMockProject(overrides?: Record<string, unknown>) {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Test Project',
    description: '',
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// create_project tool
// ---------------------------------------------------------------------------
describe('create_project', () => {
  it('mP-01: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerCreateProjectTool(server, registry, deps)).not.toThrow()
  })

  it('mP-02: tagged with pm', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerCreateProjectTool(server, registry, deps)

    expect(registry.getTagsForTool('create_project').has('pm')).toBe(true)
  })

  it('mP-03: tool listed by MCP client', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerCreateProjectTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const listResult = await client.listTools()
    const toolNames = listResult.tools.map(t => t.name)

    expect(toolNames).toContain('create_project')

    await cleanup()
  })

  it('mP-04: success: delegates to createProject use-case', async () => {
    const mockProject = createMockProject()
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockProject))
    deps.createProject = { execute: executeMock } as unknown as McpServerDependencies['createProject']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateProjectTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_project',
      arguments: { name: 'Test Project' },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledOnce()
    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.name).toBe('Test Project')
    expect(executeMock.mock.calls[0]![1]).toBe(SYSTEM_USER_ID)
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.id).toBeDefined()

    await cleanup()
  })

  it('mP-05: passes optional description', async () => {
    const mockProject = createMockProject({ description: 'D' })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockProject))
    deps.createProject = { execute: executeMock } as unknown as McpServerDependencies['createProject']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateProjectTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_project',
      arguments: { name: 'P', description: 'D' },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.description).toBe('D')

    await cleanup()
  })

  it('mP-06: passes optional metadata', async () => {
    const mockProject = createMockProject({ metadata: { k: 'v' } })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockProject))
    deps.createProject = { execute: executeMock } as unknown as McpServerDependencies['createProject']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateProjectTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'create_project',
      arguments: { name: 'P', metadata: { k: 'v' } },
    }) as CallToolResult

    const firstArg = executeMock.mock.calls[0]![0]
    expect(firstArg.metadata).toEqual({ k: 'v' })

    await cleanup()
  })

  it('mP-07: validation error from use-case', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new ValidationError('name', 'Required')))
    deps.createProject = { execute: executeMock } as unknown as McpServerDependencies['createProject']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateProjectTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_project',
      arguments: { name: 'X' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('VALIDATION_ERROR')

    await cleanup()
  })

  it('mP-08: conflict error from use-case', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new ConflictError('Project', 'x', 'duplicate')))
    deps.createProject = { execute: executeMock } as unknown as McpServerDependencies['createProject']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateProjectTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_project',
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
    deps.createProject = { execute: executeMock } as unknown as McpServerDependencies['createProject']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateProjectTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_project',
      arguments: { name: '' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('mP-10: missing name rejected by Zod', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.createProject = { execute: executeMock } as unknown as McpServerDependencies['createProject']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateProjectTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_project',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  // Edge case
  it('eP-05: name at max 200 chars accepted', async () => {
    const mockProject = createMockProject({ name: 'a'.repeat(200) })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockProject))
    deps.createProject = { execute: executeMock } as unknown as McpServerDependencies['createProject']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerCreateProjectTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'create_project',
      arguments: { name: 'a'.repeat(200) },
    }) as CallToolResult

    expect(result.isError).toBeFalsy()

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// Wiring (registerPmTools index barrel)
// ---------------------------------------------------------------------------
describe('registerPmTools wiring for create_project', () => {
  it('wP-01: registerPmTools includes create_project', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    const result = registerPmTools(server, registry, deps)

    expect(result.has('create_project')).toBe(true)
  })

  it('wP-02: create_project tagged with pm via registerPmTools', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerPmTools(server, registry, deps)

    expect(registry.getTagsForTool('create_project').has('pm')).toBe(true)
  })
})
