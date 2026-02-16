import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it } from 'vitest'

import { ToolTagRegistry } from '../src/helpers/tool-tag-registry.js'
import { registerHealthTool } from '../src/tools/health.js'

describe('registerHealthTool', () => {
  it('tC-27: registers without error', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()

    expect(() => registerHealthTool(server, registry, '1.0.0')).not.toThrow()
  })

  it('tC-28: health tool returns status ok', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerHealthTool(server, registry, '1.0.0')

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

  it('tC-29: health tool includes version', async () => {
    const server = new McpServer({ name: 'test', version: '2.5.0' })
    const registry = new ToolTagRegistry()
    registerHealthTool(server, registry, '2.5.0')

    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

    await server.connect(serverTransport)
    await client.connect(clientTransport)

    const result = await client.callTool({ name: 'health_check', arguments: {} }) as CallToolResult

    const parsed = JSON.parse((result.content as Array<{ type: string, text: string }>)[0]!.text)
    expect(parsed.version).toBe('2.5.0')

    await client.close()
    await server.close()
  })

  it('tC-30: health tool includes ISO timestamp', async () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()
    registerHealthTool(server, registry, '1.0.0')

    const client = new Client({ name: 'test-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

    await server.connect(serverTransport)
    await client.connect(clientTransport)

    const result = await client.callTool({ name: 'health_check', arguments: {} }) as CallToolResult

    const parsed = JSON.parse((result.content as Array<{ type: string, text: string }>)[0]!.text)
    expect(parsed.timestamp).toBeDefined()
    expect(new Date(parsed.timestamp).getTime()).not.toBeNaN()

    await client.close()
    await server.close()
  })

  it('tC-60: health tool registered with shared tag', () => {
    const server = new McpServer({ name: 'test', version: '1.0.0' })
    const registry = new ToolTagRegistry()

    registerHealthTool(server, registry, '1.0.0')

    const tags = registry.getTagsForTool('health_check')
    expect(tags.has('shared')).toBe(true)
  })
})
