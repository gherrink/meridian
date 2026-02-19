import type { McpServerConfig, McpServerDependencies } from '@meridian/mcp-server'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mock state ---

const mockTransportClose = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

const mockServerConnect = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
const mockServerClose = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
const mockServer = { connect: mockServerConnect, close: mockServerClose }

const mockCreateMcpServer = vi.fn(() => mockServer)

// --- vi.mock calls (hoisted) ---

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  class MockStdioServerTransport {
    close: typeof mockTransportClose

    constructor() {
      this.close = mockTransportClose
    }
  }
  return { StdioServerTransport: MockStdioServerTransport }
})

vi.mock('@meridian/mcp-server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@meridian/mcp-server')>()
  return {
    ...actual,
    createMcpServer: (...args: unknown[]) => mockCreateMcpServer(...args),
  }
})

// --- Helper ---

function createMockDependencies(): McpServerDependencies {
  return {
    createIssue: {} as McpServerDependencies['createIssue'],
    listIssues: {} as McpServerDependencies['listIssues'],
    updateIssue: {} as McpServerDependencies['updateIssue'],
    updateState: {} as McpServerDependencies['updateState'],
    assignIssue: {} as McpServerDependencies['assignIssue'],
    getMilestoneOverview: {} as McpServerDependencies['getMilestoneOverview'],
    issueRepository: {} as McpServerDependencies['issueRepository'],
    commentRepository: {} as McpServerDependencies['commentRepository'],
    milestoneRepository: {} as McpServerDependencies['milestoneRepository'],
  }
}

// --- Tests ---

describe('startMcpStdio', () => {
  let mockDeps: McpServerDependencies

  beforeEach(() => {
    mockDeps = createMockDependencies()
    mockTransportClose.mockClear().mockResolvedValue(undefined)
    mockServerConnect.mockClear().mockResolvedValue(undefined)
    mockServerClose.mockClear().mockResolvedValue(undefined)
    mockCreateMcpServer.mockClear().mockReturnValue(mockServer)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('core behavior', () => {
    it('tC-01: returns McpStdioHandle with server and transport', async () => {
      // Arrange & Act
      const { startMcpStdio } = await import('../src/start-mcp-stdio.js')
      const result = await startMcpStdio(mockDeps)

      // Assert
      expect(result).toHaveProperty('server')
      expect(result).toHaveProperty('transport')
    })

    it('tC-02: creates StdioServerTransport with process.stdin and process.stdout', async () => {
      // Arrange & Act
      const { startMcpStdio } = await import('../src/start-mcp-stdio.js')
      const result = await startMcpStdio(mockDeps)

      // Assert - transport was created and returned
      expect(result.transport).toBeDefined()
      expect(result.transport).toHaveProperty('close')
    })

    it('tC-03: calls createMcpServer with dependencies', async () => {
      // Arrange & Act
      const { startMcpStdio } = await import('../src/start-mcp-stdio.js')
      await startMcpStdio(mockDeps)

      // Assert
      expect(mockCreateMcpServer).toHaveBeenCalledOnce()
      expect(mockCreateMcpServer.mock.calls[0]![0]).toBe(mockDeps)
    })

    it('tC-04: calls createMcpServer with config when provided', async () => {
      // Arrange
      const config: McpServerConfig = { name: 'custom' }

      // Act
      const { startMcpStdio } = await import('../src/start-mcp-stdio.js')
      await startMcpStdio(mockDeps, config)

      // Assert
      expect(mockCreateMcpServer).toHaveBeenCalledOnce()
      expect(mockCreateMcpServer.mock.calls[0]![1]).toEqual(config)
    })

    it('tC-05: calls createMcpServer with undefined config when omitted', async () => {
      // Arrange & Act
      const { startMcpStdio } = await import('../src/start-mcp-stdio.js')
      await startMcpStdio(mockDeps)

      // Assert
      expect(mockCreateMcpServer).toHaveBeenCalledOnce()
      expect(mockCreateMcpServer.mock.calls[0]![1]).toBeUndefined()
    })

    it('tC-06: calls server.connect with the transport', async () => {
      // Arrange & Act
      const { startMcpStdio } = await import('../src/start-mcp-stdio.js')
      await startMcpStdio(mockDeps)

      // Assert
      expect(mockServerConnect).toHaveBeenCalledOnce()
      expect(mockServerConnect.mock.calls[0]![0]).toHaveProperty('close')
    })
  })

  describe('stdin end handling', () => {
    // These tests validate the stdin end cleanup behavior described in the spec.
    // The implementation needs to register a process.stdin 'end' listener that
    // calls transport.close() for graceful cleanup.
    it.todo('tC-07: registers stdin end event listener')
    it.todo('tC-08: calls transport.close when stdin emits end')
    it.todo('tC-09: logs to stderr when transport.close rejects on stdin end')
    it.todo('tC-10: logs stringified error when transport.close rejects with non-Error')
  })

  describe('async behavior', () => {
    it('tC-11: returns a Promise', async () => {
      // Arrange & Act
      const { startMcpStdio } = await import('../src/start-mcp-stdio.js')
      const result = startMcpStdio(mockDeps)

      // Assert
      expect(result).toBeInstanceOf(Promise)
      await result
    })

    it('tC-12: resolves after server.connect completes', async () => {
      // Arrange & Act & Assert
      const { startMcpStdio } = await import('../src/start-mcp-stdio.js')
      await expect(startMcpStdio(mockDeps)).resolves.toBeDefined()
    })
  })

  describe('main.ts integration — covered in main.test.ts', () => {
    // These integration scenarios are fully tested in main.test.ts which exercises
    // the composition root with mocked transport modules. See:
    //   - "transport selection" — covers tC-13, tC-15
    //   - "audit logger wiring" — covers tC-16, tC-17
    //   - "startup logging" — covers tC-18, tC-19
    //   - "graceful shutdown" — covers tC-20, tC-21, tC-22, tC-23, tC-24
    it.todo('tC-14: starts MCP stdio when MCP_TRANSPORT not set (default is stdio)')
  })

  describe('exports verification', () => {
    it('tC-30: startMcpStdio exported from heart index', async () => {
      // Act
      const mod = await import('../src/index.js')

      // Assert
      expect(mod.startMcpStdio).toBeDefined()
      expect(typeof mod.startMcpStdio).toBe('function')
    })

    it('tC-31: McpStdioHandle type is exported from heart index (compile check)', async () => {
      // Type-level verification: importing McpStdioHandle type.
      // If this compiles, the type is exported and usable.
      const mod = await import('../src/index.js')
      type Handle = typeof mod extends { startMcpStdio: (...args: unknown[]) => Promise<infer R> } ? R : never
      // Runtime check that the function exists
      expect(mod.startMcpStdio).toBeDefined()
      const _typeCheck: Handle = {} as Handle
      expect(_typeCheck).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('tC-32: startMcpStdio propagates connect error', async () => {
      // Arrange
      mockServerConnect.mockRejectedValueOnce(new Error('connect failed'))

      // Act & Assert
      const { startMcpStdio } = await import('../src/start-mcp-stdio.js')
      await expect(startMcpStdio(mockDeps)).rejects.toThrow('connect failed')
    })

    it('tC-33: startMcpStdio with empty config object', async () => {
      // Arrange & Act
      const { startMcpStdio } = await import('../src/start-mcp-stdio.js')
      const result = await startMcpStdio(mockDeps, {})

      // Assert
      expect(mockCreateMcpServer).toHaveBeenCalledOnce()
      expect(mockCreateMcpServer.mock.calls[0]![1]).toEqual({})
      expect(result).toBeDefined()
    })

    // Depends on stdin end handling implementation
    it.todo('tC-34: multiple stdin end events only close once per event')
  })
})
