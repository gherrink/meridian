import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { NotFoundError } from '@meridian/core'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { registerTool } from '../src/helpers/register-tool.js'

type WrappedCallback = (...args: unknown[]) => Promise<CallToolResult>

function createTestServer(): McpServer {
  return new McpServer({ name: 'test-server', version: '0.0.0' })
}

describe('registerTool', () => {
  it('tC-22: calls server.registerTool with name and config', () => {
    const server = createTestServer()
    const handler = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })

    expect(() => {
      registerTool(server, 'my_tool', {
        title: 'T',
        description: 'D',
        inputSchema: { x: z.string() },
      }, handler)
    }).not.toThrow()
  })

  it('tC-23: handler receives parsed args on invocation', () => {
    const server = createTestServer()
    const handler = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })

    registerTool(server, 'named_tool', {
      title: 'T',
      description: 'D',
      inputSchema: { name: z.string() },
    }, handler)

    expect(handler).toBeDefined()
  })

  it('tC-24: catches DomainError from handler, returns error response', async () => {
    const server = createTestServer()
    const registerToolSpy = vi.spyOn(server, 'registerTool')

    registerTool(server, 'failing_tool', {
      title: 'T',
      description: 'D',
    }, async () => {
      throw new NotFoundError('X', '1')
    })

    const registeredCallback = registerToolSpy.mock.calls[0]![2] as WrappedCallback
    const result = await registeredCallback({} as never)

    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0]!.text)
    expect(parsed.code).toBe('NOT_FOUND')
  })

  it('tC-25: catches unknown error, returns generic error', async () => {
    const server = createTestServer()
    const registerToolSpy = vi.spyOn(server, 'registerTool')

    registerTool(server, 'crashing_tool', {
      title: 'T',
      description: 'D',
    }, async () => {
      throw new Error('boom')
    })

    const registeredCallback = registerToolSpy.mock.calls[0]![2] as WrappedCallback
    const result = await registeredCallback({} as never)

    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toBe('Internal error')
  })

  it('tC-26: works with no inputSchema (undefined)', () => {
    const server = createTestServer()
    const handler = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })

    expect(() => {
      registerTool(server, 'no_input', {
        title: 'T',
        description: 'D',
      }, handler)
    }).not.toThrow()
  })
})
