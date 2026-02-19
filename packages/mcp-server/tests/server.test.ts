import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpServerDependencies } from '../src/types.js'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it } from 'vitest'

import { createMcpServer } from '../src/server.js'

function createMockDependencies(overrides?: Partial<McpServerDependencies>): McpServerDependencies {
  return {
    createIssue: {} as McpServerDependencies['createIssue'],
    createMilestone: {} as McpServerDependencies['createMilestone'],
    listIssues: {} as McpServerDependencies['listIssues'],
    updateIssue: {} as McpServerDependencies['updateIssue'],
    updateState: {} as McpServerDependencies['updateState'],
    assignIssue: {} as McpServerDependencies['assignIssue'],
    getMilestoneOverview: {} as McpServerDependencies['getMilestoneOverview'],
    issueRepository: {} as McpServerDependencies['issueRepository'],
    commentRepository: {} as McpServerDependencies['commentRepository'],
    milestoneRepository: {} as McpServerDependencies['milestoneRepository'],
    ...overrides,
  }
}

async function connectAndGetServerVersion(server: McpServer) {
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

  await server.connect(serverTransport)
  await client.connect(clientTransport)

  const serverVersion = client.getServerVersion()

  await client.close()
  await server.close()

  return serverVersion
}

async function connectAndListTools(server: McpServer): Promise<string[]> {
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

  await server.connect(serverTransport)
  await client.connect(clientTransport)

  const result = await client.listTools()
  const toolNames = result.tools.map(t => t.name)

  await client.close()
  await server.close()

  return toolNames
}

describe('createMcpServer', () => {
  it('tC-31: returns McpServer instance', () => {
    const server = createMcpServer(createMockDependencies())

    expect(server).toBeInstanceOf(McpServer)
  })

  it('tC-32: uses default name meridian', async () => {
    const server = createMcpServer(createMockDependencies())

    const serverVersion = await connectAndGetServerVersion(server)

    expect(serverVersion?.name).toBe('meridian')
  })

  it('tC-33: uses default version 0.0.0', async () => {
    const server = createMcpServer(createMockDependencies())

    const serverVersion = await connectAndGetServerVersion(server)

    expect(serverVersion?.version).toBe('0.0.0')
  })

  it('tC-34: uses custom name from config', async () => {
    const server = createMcpServer(createMockDependencies(), { name: 'custom' })

    const serverVersion = await connectAndGetServerVersion(server)

    expect(serverVersion?.name).toBe('custom')
  })

  it('tC-35: uses custom version from config', async () => {
    const server = createMcpServer(createMockDependencies(), { version: '3.0.0' })

    const serverVersion = await connectAndGetServerVersion(server)

    expect(serverVersion?.version).toBe('3.0.0')
  })

  it('tC-36: registers health tool', async () => {
    const server = createMcpServer(createMockDependencies())

    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

    await server.connect(serverTransport)
    await client.connect(clientTransport)

    const result = await client.callTool({ name: 'health_check', arguments: {} }) as CallToolResult

    const parsed = JSON.parse((result.content as Array<{ type: string, text: string }>)[0]!.text)
    expect(parsed.status).toBe('ok')

    await client.close()
    await server.close()
  })

  it('tC-61: no filter config: health_check listed', async () => {
    const server = createMcpServer(createMockDependencies())

    const toolNames = await connectAndListTools(server)

    expect(toolNames).toContain('health_check')
  })

  it('tC-62: includeTags=shared: health_check listed', async () => {
    const server = createMcpServer(createMockDependencies(), {
      includeTags: new Set(['shared']),
    })

    const toolNames = await connectAndListTools(server)

    expect(toolNames).toContain('health_check')
  })

  it('tC-63: excludeTags=shared: health_check not listed', async () => {
    const server = createMcpServer(createMockDependencies(), {
      excludeTags: new Set(['shared']),
    })

    const toolNames = await connectAndListTools(server)

    expect(toolNames).not.toContain('health_check')
  })

  it('tC-64: includeTags=dev: health_check still listed (shared auto-include)', async () => {
    const server = createMcpServer(createMockDependencies(), {
      includeTags: new Set(['dev']),
    })

    const toolNames = await connectAndListTools(server)

    expect(toolNames).toContain('health_check')
  })
})
