import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpServerDependencies } from '../src/types.js'

import { NotFoundError, ValidationError } from '@meridian/core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it, vi } from 'vitest'

import { ToolTagRegistry } from '../src/helpers/tool-tag-registry.js'
import { createMcpServer } from '../src/server.js'
import { registerAddCommentTool } from '../src/tools/dev/add-comment.js'
import { registerDevTools } from '../src/tools/dev/index.js'
import { registerListMyIssuesTool } from '../src/tools/dev/list-my-issues.js'
import { registerPickNextTaskTool } from '../src/tools/dev/pick-next-task.js'
import { registerUpdateStatusTool } from '../src/tools/dev/update-status.js'
import { registerViewIssueDetailTool } from '../src/tools/dev/view-issue-detail.js'

const VALID_ISSUE_ID = 'b0000000-0000-0000-0000-000000000001'
const VALID_USER_ID = 'c0000000-0000-0000-0000-000000000001'
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'
const VALID_COMMENT_ID = 'd0000000-0000-0000-0000-000000000001'

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
    projectId: 'a0000000-0000-0000-0000-000000000001',
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
// registerDevTools (index barrel)
// ---------------------------------------------------------------------------
describe('registerDevTools', () => {
  it('tC-01: registers all 5 dev tools', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    const result = registerDevTools(server, registry, deps)

    expect(result.has('pick_next_task')).toBe(true)
    expect(result.has('update_status')).toBe(true)
    expect(result.has('view_issue_detail')).toBe(true)
    expect(result.has('list_my_issues')).toBe(true)
    expect(result.has('add_comment')).toBe(true)
  })

  it('tC-02: all 5 tools tagged with dev', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerDevTools(server, registry, deps)

    const toolNames = ['pick_next_task', 'update_status', 'view_issue_detail', 'list_my_issues', 'add_comment']
    for (const name of toolNames) {
      expect(registry.getTagsForTool(name).has('dev')).toBe(true)
    }
  })

  it('tC-03: tools listable by MCP client', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerDevTools(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const listResult = await client.listTools()
    const toolNames = listResult.tools.map(t => t.name)

    expect(toolNames).toContain('pick_next_task')
    expect(toolNames).toContain('update_status')
    expect(toolNames).toContain('view_issue_detail')
    expect(toolNames).toContain('list_my_issues')
    expect(toolNames).toContain('add_comment')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// update_status
// ---------------------------------------------------------------------------
describe('update_status', () => {
  it('tC-04: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerUpdateStatusTool(server, registry, deps)).not.toThrow()
  })

  it('tC-05: tagged with dev', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerUpdateStatusTool(server, registry, deps)

    expect(registry.getTagsForTool('update_status').has('dev')).toBe(true)
  })

  it('tC-06: success: delegates to updateStatus use case', async () => {
    const mockIssue = createMockIssue({ status: 'in_progress' })
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
    deps.updateStatus = { execute: executeMock } as unknown as McpServerDependencies['updateStatus']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerUpdateStatusTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'update_status',
      arguments: { issueId: VALID_ISSUE_ID, status: 'in_progress' },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledOnce()
    expect(executeMock).toHaveBeenCalledWith(VALID_ISSUE_ID, 'in_progress', SYSTEM_USER_ID)
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.id).toBe(VALID_ISSUE_ID)

    await cleanup()
  })

  it('tC-07: accepts all valid statuses', async () => {
    const statuses = ['open', 'in_progress', 'closed'] as const

    for (const status of statuses) {
      const mockIssue = createMockIssue({ status })
      const deps = createMockDependencies()
      const executeMock = vi.fn().mockResolvedValue(okResult(mockIssue))
      deps.updateStatus = { execute: executeMock } as unknown as McpServerDependencies['updateStatus']

      const server = new McpServer({ name: 'test', version: '1.0.0' })
      const registry = new ToolTagRegistry()
      registerUpdateStatusTool(server, registry, deps)

      const { client, cleanup } = await connectClientToServer(server)
      const result = await client.callTool({
        name: 'update_status',
        arguments: { issueId: VALID_ISSUE_ID, status },
      }) as CallToolResult

      expect(result.isError).toBeFalsy()
      expect(executeMock).toHaveBeenCalledWith(VALID_ISSUE_ID, status, SYSTEM_USER_ID)

      await cleanup()
    }
  })

  it('tC-08: use case returns NOT_FOUND', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new NotFoundError('Issue', VALID_ISSUE_ID)))
    deps.updateStatus = { execute: executeMock } as unknown as McpServerDependencies['updateStatus']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerUpdateStatusTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'update_status',
      arguments: { issueId: VALID_ISSUE_ID, status: 'in_progress' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('NOT_FOUND')

    await cleanup()
  })

  it('tC-09: use case returns VALIDATION_ERROR', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new ValidationError('status', 'Invalid')))
    deps.updateStatus = { execute: executeMock } as unknown as McpServerDependencies['updateStatus']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerUpdateStatusTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'update_status',
      arguments: { issueId: VALID_ISSUE_ID, status: 'in_progress' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const parsed = parseTextContent(result)
    expect(parsed.code).toBe('VALIDATION_ERROR')

    await cleanup()
  })

  it('tC-10: invalid issueId (not UUID)', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.updateStatus = { execute: executeMock } as unknown as McpServerDependencies['updateStatus']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerUpdateStatusTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'update_status',
      arguments: { issueId: 'bad', status: 'open' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-11: invalid status value', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.updateStatus = { execute: executeMock } as unknown as McpServerDependencies['updateStatus']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerUpdateStatusTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'update_status',
      arguments: { issueId: VALID_ISSUE_ID, status: 'pending' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// add_comment
// ---------------------------------------------------------------------------
describe('add_comment', () => {
  it('tC-12: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerAddCommentTool(server, registry, deps)).not.toThrow()
  })

  it('tC-13: tagged with dev', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerAddCommentTool(server, registry, deps)

    expect(registry.getTagsForTool('add_comment').has('dev')).toBe(true)
  })

  it('tC-14: success: calls commentRepository.create', async () => {
    const mockComment = createMockComment()
    const deps = createMockDependencies()
    const createMock = vi.fn().mockResolvedValue(mockComment)
    deps.commentRepository = { create: createMock, getByIssueId: vi.fn() } as unknown as McpServerDependencies['commentRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerAddCommentTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'add_comment',
      arguments: { issueId: VALID_ISSUE_ID, body: 'Hello world' },
    }) as CallToolResult

    expect(createMock).toHaveBeenCalledOnce()
    const callArg = createMock.mock.calls[0]![0]
    expect(callArg.issueId).toBe(VALID_ISSUE_ID)
    expect(callArg.body).toBe('Hello world')
    expect(callArg.authorId).toBe(SYSTEM_USER_ID)
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.id).toBeDefined()
    expect(parsed.issueId).toBeDefined()
    expect(parsed.createdAt).toBeDefined()

    await cleanup()
  })

  it('tC-15: response contains id, issueId, createdAt', async () => {
    const mockComment = createMockComment()
    const deps = createMockDependencies()
    const createMock = vi.fn().mockResolvedValue(mockComment)
    deps.commentRepository = { create: createMock, getByIssueId: vi.fn() } as unknown as McpServerDependencies['commentRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerAddCommentTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'add_comment',
      arguments: { issueId: VALID_ISSUE_ID, body: 'test comment' },
    }) as CallToolResult

    const parsed = parseTextContent(result)
    expect(parsed.id).toBe(VALID_COMMENT_ID)
    expect(parsed.issueId).toBe(VALID_ISSUE_ID)
    expect(parsed.createdAt).toBeDefined()

    await cleanup()
  })

  it('tC-16: empty body rejected', async () => {
    const deps = createMockDependencies()
    const createMock = vi.fn()
    deps.commentRepository = { create: createMock, getByIssueId: vi.fn() } as unknown as McpServerDependencies['commentRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerAddCommentTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'add_comment',
      arguments: { issueId: VALID_ISSUE_ID, body: '' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(createMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-17: invalid issueId (not UUID)', async () => {
    const deps = createMockDependencies()
    const createMock = vi.fn()
    deps.commentRepository = { create: createMock, getByIssueId: vi.fn() } as unknown as McpServerDependencies['commentRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerAddCommentTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'add_comment',
      arguments: { issueId: 'bad', body: 'hello' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(createMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-18: repository throws error', async () => {
    const deps = createMockDependencies()
    const createMock = vi.fn().mockRejectedValue(new Error('DB fail'))
    deps.commentRepository = { create: createMock, getByIssueId: vi.fn() } as unknown as McpServerDependencies['commentRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerAddCommentTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'add_comment',
      arguments: { issueId: VALID_ISSUE_ID, body: 'hello' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const text = (result.content as Array<{ type: string, text: string }>)[0]!.text
    expect(text).toContain('Internal error')

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// view_issue_detail
// ---------------------------------------------------------------------------
describe('view_issue_detail', () => {
  it('tC-19: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerViewIssueDetailTool(server, registry, deps)).not.toThrow()
  })

  it('tC-20: tagged with dev', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerViewIssueDetailTool(server, registry, deps)

    expect(registry.getTagsForTool('view_issue_detail').has('dev')).toBe(true)
  })

  it('tC-21: success: composes getById + getByIssueId', async () => {
    const mockIssue = createMockIssue()
    const mockComments = [createMockComment(), createMockComment({ id: 'd0000000-0000-0000-0000-000000000002', body: 'second' })]
    const paginatedComments = createPaginatedResult(mockComments, { limit: 50 })

    const deps = createMockDependencies()
    const getByIdMock = vi.fn().mockResolvedValue(mockIssue)
    const getByIssueIdMock = vi.fn().mockResolvedValue(paginatedComments)
    deps.issueRepository = { getById: getByIdMock } as unknown as McpServerDependencies['issueRepository']
    deps.commentRepository = { create: vi.fn(), getByIssueId: getByIssueIdMock } as unknown as McpServerDependencies['commentRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerViewIssueDetailTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'view_issue_detail',
      arguments: { issueId: VALID_ISSUE_ID },
    }) as CallToolResult

    expect(getByIdMock).toHaveBeenCalledWith(VALID_ISSUE_ID)
    expect(getByIssueIdMock).toHaveBeenCalledWith(VALID_ISSUE_ID, { page: 1, limit: 50 })
    expect(result.isError).toBeFalsy()
    const parsed = parseTextContent(result)
    expect(parsed.issue).toBeDefined()
    expect(parsed.comments).toBeInstanceOf(Array)

    await cleanup()
  })

  it('tC-22: issue with no comments', async () => {
    const mockIssue = createMockIssue()
    const paginatedComments = createPaginatedResult([], { limit: 50 })

    const deps = createMockDependencies()
    const getByIdMock = vi.fn().mockResolvedValue(mockIssue)
    const getByIssueIdMock = vi.fn().mockResolvedValue(paginatedComments)
    deps.issueRepository = { getById: getByIdMock } as unknown as McpServerDependencies['issueRepository']
    deps.commentRepository = { create: vi.fn(), getByIssueId: getByIssueIdMock } as unknown as McpServerDependencies['commentRepository']

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

  it('tC-23: invalid issueId (not UUID)', async () => {
    const deps = createMockDependencies()
    const getByIdMock = vi.fn()
    deps.issueRepository = { getById: getByIdMock } as unknown as McpServerDependencies['issueRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerViewIssueDetailTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'view_issue_detail',
      arguments: { issueId: 'bad' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(getByIdMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-24: getById throws NotFoundError', async () => {
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

// ---------------------------------------------------------------------------
// list_my_issues
// ---------------------------------------------------------------------------
describe('list_my_issues', () => {
  it('tC-25: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerListMyIssuesTool(server, registry, deps)).not.toThrow()
  })

  it('tC-26: tagged with dev', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerListMyIssuesTool(server, registry, deps)

    expect(registry.getTagsForTool('list_my_issues').has('dev')).toBe(true)
  })

  it('tC-27: success: delegates to listIssues with assigneeId', async () => {
    const issues = [createMockIssue({ assigneeIds: [VALID_USER_ID] })]
    const paginatedIssues = createPaginatedResult(issues)

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMyIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: VALID_USER_ID },
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledOnce()
    const callArgs = executeMock.mock.calls[0]!
    expect(callArgs[0]).toEqual(expect.objectContaining({ assigneeId: VALID_USER_ID }))
    expect(callArgs[1]).toEqual({ page: 1, limit: 20 })
    expect(result.isError).toBeFalsy()

    await cleanup()
  })

  it('tC-28: groups by status with in_progress first', async () => {
    const issues = [
      createMockIssue({ id: 'b0000000-0000-0000-0000-000000000011', status: 'in_progress', title: 'IP 1' }),
      createMockIssue({ id: 'b0000000-0000-0000-0000-000000000012', status: 'in_progress', title: 'IP 2' }),
      createMockIssue({ id: 'b0000000-0000-0000-0000-000000000013', status: 'open', title: 'Open 1' }),
      createMockIssue({ id: 'b0000000-0000-0000-0000-000000000014', status: 'closed', title: 'Closed 1' }),
    ]
    const paginatedIssues = createPaginatedResult(issues, { total: 4 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMyIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: VALID_USER_ID },
    }) as CallToolResult

    const parsed = parseTextContent(result)
    const groupedKeys = Object.keys(parsed.grouped)
    const ipIndex = groupedKeys.indexOf('in_progress')
    const openIndex = groupedKeys.indexOf('open')
    const closedIndex = groupedKeys.indexOf('closed')

    expect(ipIndex).toBeLessThan(openIndex)
    expect(openIndex).toBeLessThan(closedIndex)

    await cleanup()
  })

  it('tC-29: optional status filter passed through', async () => {
    const paginatedIssues = createPaginatedResult([createMockIssue({ status: 'open' })])

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMyIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: VALID_USER_ID, status: 'open' },
    }) as CallToolResult

    const callArgs = executeMock.mock.calls[0]!
    expect(callArgs[0]).toEqual(expect.objectContaining({ assigneeId: VALID_USER_ID, status: 'open' }))

    await cleanup()
  })

  it('tC-30: custom pagination', async () => {
    const paginatedIssues = createPaginatedResult([], { page: 2, limit: 10 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMyIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: VALID_USER_ID, page: 2, limit: 10 },
    }) as CallToolResult

    const callArgs = executeMock.mock.calls[0]!
    expect(callArgs[1]).toEqual({ page: 2, limit: 10 })

    await cleanup()
  })

  it('tC-31: defaults page=1, limit=20', async () => {
    const paginatedIssues = createPaginatedResult([])

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMyIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: VALID_USER_ID },
    }) as CallToolResult

    const callArgs = executeMock.mock.calls[0]!
    expect(callArgs[1]).toEqual({ page: 1, limit: 20 })

    await cleanup()
  })

  it('tC-32: use case returns error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new ValidationError('filter', 'Invalid')))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMyIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: VALID_USER_ID },
    }) as CallToolResult

    expect(result.isError).toBe(true)

    await cleanup()
  })

  it('tC-33: limit exceeds max 50', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMyIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: VALID_USER_ID, limit: 100 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-34: page 0 (non-positive)', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMyIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: VALID_USER_ID, page: 0 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-35: empty result set', async () => {
    const paginatedIssues = createPaginatedResult([], { total: 0 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMyIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: VALID_USER_ID },
    }) as CallToolResult

    const parsed = parseTextContent(result)
    expect(parsed.grouped).toEqual({})
    expect(parsed.total).toBe(0)

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// pick_next_task
// ---------------------------------------------------------------------------
describe('pick_next_task', () => {
  it('tC-36: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    expect(() => registerPickNextTaskTool(server, registry, deps)).not.toThrow()
  })

  it('tC-37: tagged with dev', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    const deps = createMockDependencies()

    registerPickNextTaskTool(server, registry, deps)

    expect(registry.getTagsForTool('pick_next_task').has('dev')).toBe(true)
  })

  it('tC-38: success: delegates to listIssues with sort by priority desc', async () => {
    const issues = [createMockIssue({ priority: 'urgent' }), createMockIssue({ priority: 'high' })]
    const paginatedIssues = createPaginatedResult(issues, { limit: 3 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerPickNextTaskTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'pick_next_task',
      arguments: {},
    }) as CallToolResult

    expect(executeMock).toHaveBeenCalledOnce()
    const callArgs = executeMock.mock.calls[0]!
    expect(callArgs[1]).toEqual(expect.objectContaining({ page: 1, limit: 3 }))
    expect(callArgs[2]).toEqual({ field: 'priority', direction: 'desc' })
    expect(result.isError).toBeFalsy()

    await cleanup()
  })

  it('tC-39: returns ranked suggestions', async () => {
    const issues = [
      createMockIssue({ id: 'b0000000-0000-0000-0000-000000000011', title: 'Task 1', status: 'open', priority: 'urgent', assigneeIds: [] }),
      createMockIssue({ id: 'b0000000-0000-0000-0000-000000000012', title: 'Task 2', status: 'open', priority: 'high', assigneeIds: [] }),
      createMockIssue({ id: 'b0000000-0000-0000-0000-000000000013', title: 'Task 3', status: 'open', priority: 'normal', assigneeIds: [] }),
    ]
    const paginatedIssues = createPaginatedResult(issues, { total: 3, limit: 3 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerPickNextTaskTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'pick_next_task',
      arguments: {},
    }) as CallToolResult

    const parsed = parseTextContent(result)
    expect(parsed.suggestions).toHaveLength(3)
    expect(parsed.suggestions[0].rank).toBe(1)
    expect(parsed.suggestions[1].rank).toBe(2)
    expect(parsed.suggestions[2].rank).toBe(3)
    for (const suggestion of parsed.suggestions) {
      expect(suggestion.id).toBeDefined()
      expect(suggestion.title).toBeDefined()
      expect(suggestion.status).toBeDefined()
      expect(suggestion.priority).toBeDefined()
      expect(suggestion).toHaveProperty('assigneeIds')
    }

    await cleanup()
  })

  it('tC-40: optional filters passed through', async () => {
    const paginatedIssues = createPaginatedResult([createMockIssue()], { limit: 3 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerPickNextTaskTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'pick_next_task',
      arguments: { status: 'open', priority: 'high', assigneeId: VALID_USER_ID },
    }) as CallToolResult

    const callArgs = executeMock.mock.calls[0]!
    expect(callArgs[0]).toEqual(expect.objectContaining({ status: 'open', priority: 'high', assigneeId: VALID_USER_ID }))

    await cleanup()
  })

  it('tC-41: default limit is 3', async () => {
    const paginatedIssues = createPaginatedResult([], { limit: 3 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerPickNextTaskTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'pick_next_task',
      arguments: {},
    }) as CallToolResult

    const callArgs = executeMock.mock.calls[0]!
    expect(callArgs[1]).toEqual(expect.objectContaining({ limit: 3 }))

    await cleanup()
  })

  it('tC-42: custom limit', async () => {
    const paginatedIssues = createPaginatedResult([], { limit: 5 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerPickNextTaskTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'pick_next_task',
      arguments: { limit: 5 },
    }) as CallToolResult

    const callArgs = executeMock.mock.calls[0]!
    expect(callArgs[1]).toEqual(expect.objectContaining({ limit: 5 }))

    await cleanup()
  })

  it('tC-43: limit exceeds max 10', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn()
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerPickNextTaskTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'pick_next_task',
      arguments: { limit: 20 },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    expect(executeMock).not.toHaveBeenCalled()

    await cleanup()
  })

  it('tC-44: use case returns error', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(errResult(new ValidationError('filter', 'Invalid')))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerPickNextTaskTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'pick_next_task',
      arguments: {},
    }) as CallToolResult

    expect(result.isError).toBe(true)

    await cleanup()
  })

  it('tC-45: empty result', async () => {
    const paginatedIssues = createPaginatedResult([], { total: 0, limit: 3 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerPickNextTaskTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'pick_next_task',
      arguments: {},
    }) as CallToolResult

    const parsed = parseTextContent(result)
    expect(parsed.suggestions).toEqual([])
    expect(parsed.total).toBe(0)

    await cleanup()
  })
})

// ---------------------------------------------------------------------------
// Server integration (dev tools)
// ---------------------------------------------------------------------------
describe('server integration (dev tools)', () => {
  async function listToolNames(server: McpServer): Promise<string[]> {
    const { client, cleanup } = await connectClientToServer(server)
    const listResult = await client.listTools()
    const names = listResult.tools.map(t => t.name)
    await cleanup()
    return names
  }

  const DEV_TOOL_NAMES = ['pick_next_task', 'update_status', 'view_issue_detail', 'list_my_issues', 'add_comment']
  const PM_TOOL_NAMES = ['create_epic', 'view_roadmap', 'assign_priority', 'list_milestones', 'project_overview']

  it('tC-46: dev tools visible when no tag filter', async () => {
    const server = createMcpServer(createMockDependencies())

    const toolNames = await listToolNames(server)

    for (const name of DEV_TOOL_NAMES) {
      expect(toolNames).toContain(name)
    }
  })

  it('tC-47: dev tools visible with includeTags=dev', async () => {
    const server = createMcpServer(createMockDependencies(), {
      includeTags: new Set(['dev']),
    })

    const toolNames = await listToolNames(server)

    for (const name of DEV_TOOL_NAMES) {
      expect(toolNames).toContain(name)
    }
  })

  it('tC-48: dev tools hidden with excludeTags=dev', async () => {
    const server = createMcpServer(createMockDependencies(), {
      excludeTags: new Set(['dev']),
    })

    const toolNames = await listToolNames(server)

    for (const name of DEV_TOOL_NAMES) {
      expect(toolNames).not.toContain(name)
    }
  })

  it('tC-49: pm tools hidden when includeTags=dev only', async () => {
    const server = createMcpServer(createMockDependencies(), {
      includeTags: new Set(['dev']),
    })

    const toolNames = await listToolNames(server)

    for (const name of PM_TOOL_NAMES) {
      expect(toolNames).not.toContain(name)
    }
  })
})

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------
describe('edge cases', () => {
  it('tC-50: update_status: handler exception caught', async () => {
    const deps = createMockDependencies()
    const executeMock = vi.fn().mockRejectedValue(new Error('Unexpected crash'))
    deps.updateStatus = { execute: executeMock } as unknown as McpServerDependencies['updateStatus']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerUpdateStatusTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'update_status',
      arguments: { issueId: VALID_ISSUE_ID, status: 'open' },
    }) as CallToolResult

    expect(result.isError).toBe(true)
    const text = (result.content as Array<{ type: string, text: string }>)[0]!.text
    expect(text).toContain('Internal error')

    await cleanup()
  })

  it('tC-51: view_issue_detail: getByIssueId throws', async () => {
    const mockIssue = createMockIssue()
    const deps = createMockDependencies()
    const getByIdMock = vi.fn().mockResolvedValue(mockIssue)
    const getByIssueIdMock = vi.fn().mockRejectedValue(new Error('DB fail'))
    deps.issueRepository = { getById: getByIdMock } as unknown as McpServerDependencies['issueRepository']
    deps.commentRepository = { create: vi.fn(), getByIssueId: getByIssueIdMock } as unknown as McpServerDependencies['commentRepository']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerViewIssueDetailTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'view_issue_detail',
      arguments: { issueId: VALID_ISSUE_ID },
    }) as CallToolResult

    expect(result.isError).toBe(true)

    await cleanup()
  })

  it('tC-52: list_my_issues: only statuses present appear in grouped', async () => {
    const issues = [
      createMockIssue({ id: 'b0000000-0000-0000-0000-000000000011', status: 'open', title: 'Open 1' }),
      createMockIssue({ id: 'b0000000-0000-0000-0000-000000000012', status: 'open', title: 'Open 2' }),
    ]
    const paginatedIssues = createPaginatedResult(issues, { total: 2 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerListMyIssuesTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    const result = await client.callTool({
      name: 'list_my_issues',
      arguments: { assigneeId: VALID_USER_ID },
    }) as CallToolResult

    const parsed = parseTextContent(result)
    const groupedKeys = Object.keys(parsed.grouped)
    expect(groupedKeys).toContain('open')
    expect(groupedKeys).not.toContain('in_progress')
    expect(groupedKeys).not.toContain('closed')

    await cleanup()
  })

  it('tC-53: pick_next_task: all optional args omitted', async () => {
    const paginatedIssues = createPaginatedResult([], { total: 0, limit: 3 })

    const deps = createMockDependencies()
    const executeMock = vi.fn().mockResolvedValue(okResult(paginatedIssues))
    deps.listIssues = { execute: executeMock } as unknown as McpServerDependencies['listIssues']

    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerPickNextTaskTool(server, registry, deps)

    const { client, cleanup } = await connectClientToServer(server)
    await client.callTool({
      name: 'pick_next_task',
      arguments: {},
    }) as CallToolResult

    const callArgs = executeMock.mock.calls[0]!
    expect(callArgs[0]).toEqual(expect.objectContaining({
      status: undefined,
      priority: undefined,
      assigneeId: undefined,
    }))

    await cleanup()
  })
})
