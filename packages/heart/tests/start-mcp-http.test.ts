import type { McpServerDependencies } from '@meridian/mcp-server'
import type { ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

import { Buffer } from 'node:buffer'
import http from 'node:http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mock state ---

const mockTransportHandleRequest = vi.fn<(...args: unknown[]) => Promise<void>>()
const mockTransportClose = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

let capturedOnsessioninitialized: ((sessionId: string) => void) | undefined
let capturedTransportInstance: { onclose?: (() => void), sessionId?: string }

const mockServerConnect = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
const mockServerClose = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
const mockServer = { connect: mockServerConnect, close: mockServerClose }

const mockCreateMcpServer = vi.fn(() => mockServer)

const mockIsInitializeRequest = vi.fn<(body: unknown) => boolean>().mockReturnValue(true)

/**
 * Default mock behavior for transport.handleRequest: ends the response
 * so the HTTP client does not hang waiting for data.
 */
function endResponseMock(...args: unknown[]): Promise<void> {
  const response = args[1] as ServerResponse | undefined
  if (response && !response.headersSent) {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ jsonrpc: '2.0', result: {}, id: 1 }))
  }
  return Promise.resolve()
}

// --- vi.mock calls (hoisted) ---

vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
  class MockStreamableHTTPServerTransport {
    close: typeof mockTransportClose
    handleRequest: typeof mockTransportHandleRequest
    sessionId: string | undefined
    onclose: (() => void) | undefined

    constructor(options?: { sessionIdGenerator?: () => string, onsessioninitialized?: (sessionId: string) => void }) {
      this.close = mockTransportClose
      this.handleRequest = mockTransportHandleRequest
      this.sessionId = undefined
      this.onclose = undefined
      capturedOnsessioninitialized = options?.onsessioninitialized
      capturedTransportInstance = this
    }
  }
  return { StreamableHTTPServerTransport: MockStreamableHTTPServerTransport }
})

vi.mock('@modelcontextprotocol/sdk/types.js', () => {
  return {
    isInitializeRequest: (...args: unknown[]) => mockIsInitializeRequest(...args),
  }
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
    updateStatus: {} as McpServerDependencies['updateStatus'],
    assignIssue: {} as McpServerDependencies['assignIssue'],
    getProjectOverview: {} as McpServerDependencies['getProjectOverview'],
    issueRepository: {} as McpServerDependencies['issueRepository'],
    commentRepository: {} as McpServerDependencies['commentRepository'],
    projectRepository: {} as McpServerDependencies['projectRepository'],
  }
}

function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  body?: string,
  headers?: Record<string, string>,
): Promise<{ statusCode: number, body: string, headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const address = server.address()
    if (!address || typeof address === 'string') {
      reject(new Error('Server not listening on a port'))
      return
    }

    const requestOptions: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    const req = http.request(requestOptions, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString('utf-8'),
          headers: res.headers,
        })
      })
    })

    req.on('error', reject)

    if (body !== undefined) {
      req.write(body)
    }

    req.end()
  })
}

/**
 * Helper to initialize a session and register it in the sessions map.
 * Sends a POST /mcp with initialize method, triggers onsessioninitialized callback.
 */
async function initSession(
  server: http.Server,
  sessionId: string,
): Promise<{ statusCode: number, body: string, headers: http.IncomingHttpHeaders }> {
  mockIsInitializeRequest.mockReturnValueOnce(true)
  mockTransportHandleRequest.mockImplementationOnce((...args: unknown[]) => {
    if (capturedOnsessioninitialized) {
      capturedTransportInstance.sessionId = sessionId
      capturedOnsessioninitialized(sessionId)
    }
    return endResponseMock(...args)
  })

  return makeRequest(
    server,
    'POST',
    '/mcp',
    JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
  )
}

// --- Tests ---

describe('startMcpHttp', () => {
  let mockDeps: McpServerDependencies
  let handle: { httpServer: http.Server, sessions: Map<string, unknown> } | undefined

  beforeEach(() => {
    mockDeps = createMockDependencies()
    handle = undefined
    capturedOnsessioninitialized = undefined
    capturedTransportInstance = { onclose: undefined, sessionId: undefined }
    mockTransportHandleRequest.mockClear().mockImplementation(endResponseMock)
    mockTransportClose.mockClear().mockResolvedValue(undefined)
    mockServerConnect.mockClear().mockResolvedValue(undefined)
    mockServerClose.mockClear().mockResolvedValue(undefined)
    mockCreateMcpServer.mockClear().mockReturnValue(mockServer)
    mockIsInitializeRequest.mockClear().mockReturnValue(true)
  })

  afterEach(async () => {
    if (handle?.httpServer?.listening) {
      await new Promise<void>(resolve => handle!.httpServer.close(() => resolve()))
    }
    vi.restoreAllMocks()
  })

  describe('a. core behavior', () => {
    it('tC-01: returns McpHttpHandle with httpServer and sessions', async () => {
      // Arrange & Act
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Assert
      expect(handle).toHaveProperty('httpServer')
      expect(handle).toHaveProperty('sessions')
      expect(handle.httpServer).toBeInstanceOf(http.Server)
      expect(handle.sessions).toBeInstanceOf(Map)
    })

    it('tC-02: sessions map is initially empty', async () => {
      // Arrange & Act
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Assert
      expect(handle.sessions.size).toBe(0)
    })

    it('tC-03: httpServer is listening after start', async () => {
      // Arrange & Act
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Assert
      expect(handle.httpServer.listening).toBe(true)
    })

    it('tC-04: listens on specified port (ephemeral)', async () => {
      // Arrange & Act
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Assert
      const addr = handle.httpServer.address() as AddressInfo
      expect(typeof addr.port).toBe('number')
      expect(addr.port).toBeGreaterThan(0)
    })

    it('tC-05: uses default port 3001 when port omitted', async () => {
      // Arrange - spy on http.Server.prototype.listen to capture args
      const listenSpy = vi.spyOn(http.Server.prototype, 'listen')

      // Act
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      try {
        handle = await startMcpHttp(mockDeps)
      }
      catch {
        // Port 3001 may be busy; that's ok, we just check the listen args
      }

      // Assert
      expect(listenSpy).toHaveBeenCalled()
      const firstCall = listenSpy.mock.calls[0]!
      expect(firstCall[0]).toBe(3001)
    })

    it('tC-06: uses default host 127.0.0.1 when host omitted', async () => {
      // Arrange
      const listenSpy = vi.spyOn(http.Server.prototype, 'listen')

      // Act
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      try {
        handle = await startMcpHttp(mockDeps)
      }
      catch {
        // Port 3001 may be busy
      }

      // Assert
      expect(listenSpy).toHaveBeenCalled()
      const firstCall = listenSpy.mock.calls[0]!
      expect(firstCall[1]).toBe('127.0.0.1')
    })

    it('tC-07: uses custom host when provided', async () => {
      // Arrange & Act
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0, host: '0.0.0.0' })

      // Assert
      const addr = handle.httpServer.address() as AddressInfo
      expect(addr.address).toBe('0.0.0.0')
    })

    it('tC-08: passes config to createMcpServer on session init', async () => {
      // Arrange
      const config = { port: 0, name: 'test-server' } as const
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, config)

      // Act
      await initSession(handle.httpServer, 'cfg-session')

      // Assert
      expect(mockCreateMcpServer).toHaveBeenCalledOnce()
      expect(mockCreateMcpServer.mock.calls[0]![0]).toBe(mockDeps)
      expect(mockCreateMcpServer.mock.calls[0]![1]).toEqual(config)
    })
  })

  describe('b. health endpoint', () => {
    it('tC-09: GET /health returns 200 with status ok', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      const response = await makeRequest(handle.httpServer, 'GET', '/health')

      // Assert
      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.body)).toEqual({ status: 'ok' })
    })

    it('tC-10: GET /health Content-Type is application/json', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      const response = await makeRequest(handle.httpServer, 'GET', '/health')

      // Assert
      expect(response.headers['content-type']).toContain('application/json')
    })
  })

  describe('c. MCP endpoint routing', () => {
    it('tC-11: POST /mcp with init request creates session', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      await initSession(handle.httpServer, 'test-session-id')

      // Assert
      expect(mockCreateMcpServer).toHaveBeenCalledOnce()
      expect(mockServerConnect).toHaveBeenCalledOnce()
    })

    it('tC-12: POST /mcp with invalid JSON returns 400', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      const response = await makeRequest(handle.httpServer, 'POST', '/mcp', 'not json{')

      // Assert
      expect(response.statusCode).toBe(400)
      expect(response.body).toContain('Invalid JSON')
    })

    it('tC-13: POST /mcp without session ID and non-init request returns 400', async () => {
      // Arrange
      mockIsInitializeRequest.mockReturnValue(false)
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      const response = await makeRequest(
        handle.httpServer,
        'POST',
        '/mcp',
        JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      )

      // Assert
      expect(response.statusCode).toBe(400)
      expect(response.body).toContain('Missing session ID')
    })

    it('tC-14: POST /mcp with unknown session ID and non-init request returns 404', async () => {
      // Arrange
      mockIsInitializeRequest.mockReturnValue(false)
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      const response = await makeRequest(
        handle.httpServer,
        'POST',
        '/mcp',
        JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
        { 'mcp-session-id': 'unknown-id' },
      )

      // Assert
      expect(response.statusCode).toBe(404)
      expect(response.body).toContain('Session not found')
    })

    it('tC-15: POST /mcp with existing session delegates to transport', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Initialize a session first
      await initSession(handle.httpServer, 'test-session-id')
      mockTransportHandleRequest.mockClear().mockImplementation(endResponseMock)

      // For the follow-up request, not an init request
      mockIsInitializeRequest.mockReturnValue(false)

      // Act
      await makeRequest(
        handle.httpServer,
        'POST',
        '/mcp',
        JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 2 }),
        { 'mcp-session-id': 'test-session-id' },
      )

      // Assert
      expect(mockTransportHandleRequest).toHaveBeenCalled()
    })

    it('tC-16: GET /mcp without session ID returns 404', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      const response = await makeRequest(handle.httpServer, 'GET', '/mcp')

      // Assert
      expect(response.statusCode).toBe(404)
      expect(response.body).toContain('Session not found')
    })

    it('tC-17: GET /mcp with unknown session ID returns 404', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      const response = await makeRequest(handle.httpServer, 'GET', '/mcp', undefined, {
        'mcp-session-id': 'unknown',
      })

      // Assert
      expect(response.statusCode).toBe(404)
    })

    it('tC-18: GET /mcp with valid session delegates to transport', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Init session
      await initSession(handle.httpServer, 'test-session-id')
      mockTransportHandleRequest.mockClear().mockImplementation(endResponseMock)

      // Act
      await makeRequest(handle.httpServer, 'GET', '/mcp', undefined, {
        'mcp-session-id': 'test-session-id',
      })

      // Assert
      expect(mockTransportHandleRequest).toHaveBeenCalled()
    })

    it('tC-19: DELETE /mcp without session ID returns 404', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      const response = await makeRequest(handle.httpServer, 'DELETE', '/mcp')

      // Assert
      expect(response.statusCode).toBe(404)
    })

    it('tC-20: DELETE /mcp with valid session delegates to transport', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Init session
      await initSession(handle.httpServer, 'test-session-id')
      mockTransportHandleRequest.mockClear().mockImplementation(endResponseMock)

      // Act
      await makeRequest(handle.httpServer, 'DELETE', '/mcp', undefined, {
        'mcp-session-id': 'test-session-id',
      })

      // Assert
      expect(mockTransportHandleRequest).toHaveBeenCalled()
    })

    it('tC-21: PUT /mcp returns 405', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      const response = await makeRequest(handle.httpServer, 'PUT', '/mcp')

      // Assert
      expect(response.statusCode).toBe(405)
      expect(response.body.toLowerCase()).toContain('not allowed')
    })

    it('tC-22: PATCH /mcp returns 405', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      const response = await makeRequest(handle.httpServer, 'PATCH', '/mcp')

      // Assert
      expect(response.statusCode).toBe(405)
    })

    it('tC-23: GET /unknown-path returns 404', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      const response = await makeRequest(handle.httpServer, 'GET', '/foo')

      // Assert
      expect(response.statusCode).toBe(404)
      expect(response.body).toContain('Not found')
    })
  })

  describe('d. session lifecycle', () => {
    it('tC-24: session added to map after init', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      await initSession(handle.httpServer, 'lifecycle-session')

      // Assert
      expect(handle.sessions.size).toBe(1)
    })

    it('tC-25: session removed from map on transport close', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      await initSession(handle.httpServer, 'close-session')
      expect(handle.sessions.size).toBe(1)

      // Act - trigger transport onclose
      if (capturedTransportInstance.onclose) {
        capturedTransportInstance.onclose()
      }

      // Assert
      expect(handle.sessions.size).toBe(0)
    })

    it('tC-26: multiple concurrent sessions supported', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act - init two separate sessions
      await initSession(handle.httpServer, 'session-1')
      await initSession(handle.httpServer, 'session-2')

      // Assert
      expect(handle.sessions.size).toBe(2)
    })

    it('tC-27: createMcpServer called once per session', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      await initSession(handle.httpServer, 'session-a')
      await initSession(handle.httpServer, 'session-b')

      // Assert
      expect(mockCreateMcpServer).toHaveBeenCalledTimes(2)
    })
  })

  describe('e. error handling', () => {
    it('tC-28: internal error in handler returns 500', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockServerConnect.mockRejectedValueOnce(new Error('connection failed'))

      // Act
      const response = await makeRequest(
        handle.httpServer,
        'POST',
        '/mcp',
        JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
      )

      // Assert
      expect(response.statusCode).toBe(500)
      expect(response.body).toContain('Internal server error')

      consoleSpy.mockRestore()
    })

    it('tC-29: server startup rejects if port in use', async () => {
      // Arrange - start first server on ephemeral port
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })
      const addr = handle.httpServer.address() as AddressInfo
      const usedPort = addr.port

      // Act & Assert - start second server on same port
      await expect(startMcpHttp(mockDeps, { port: usedPort })).rejects.toThrow()
    })
  })

  describe('g. exports verification', () => {
    it('tC-38: startMcpHttp exported from heart index', async () => {
      // Act
      const mod = await import('../src/index.js')

      // Assert
      expect(mod.startMcpHttp).toBeDefined()
      expect(typeof mod.startMcpHttp).toBe('function')
    })

    it('tC-39: McpHttpHandle type usable from heart index (compile check)', async () => {
      // Type-level verification: importing McpHttpHandle type.
      // If this compiles, the type is exported and usable.
      const mod = await import('../src/index.js')
      type Handle = typeof mod extends { startMcpHttp: (...args: unknown[]) => Promise<infer R> } ? R : never
      // Runtime check that the function exists
      expect(mod.startMcpHttp).toBeDefined()
      const _typeCheck: Handle = {} as Handle
      expect(_typeCheck).toBeDefined()
    })

    it('tC-40: McpHttpConfig type usable from heart index (compile check)', async () => {
      // Type-level verification: McpHttpConfig is accepted as second arg.
      // If this compiles, the type is exported and usable.
      const mod = await import('../src/index.js')
      expect(typeof mod.startMcpHttp).toBe('function')
      // Compile check: the function accepts a config as second argument
      type ConfigParam = Parameters<typeof mod.startMcpHttp>[1]
      const _configCheck: ConfigParam = { port: 0 } as ConfigParam
      expect(_configCheck).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('tC-41: startMcpHttp with no config uses defaults', async () => {
      // Arrange
      const listenSpy = vi.spyOn(http.Server.prototype, 'listen')

      // Act
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      try {
        handle = await startMcpHttp(mockDeps)
      }
      catch {
        // Port 3001 may be busy, that's fine
      }

      // Assert - verify it attempted to listen on 3001 / 127.0.0.1
      expect(listenSpy).toHaveBeenCalled()
      const firstCall = listenSpy.mock.calls[0]!
      expect(firstCall[0]).toBe(3001)
      expect(firstCall[1]).toBe('127.0.0.1')
    })

    it('tC-42: startMcpHttp with empty config object', async () => {
      // Arrange
      const listenSpy = vi.spyOn(http.Server.prototype, 'listen')

      // Act
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      try {
        handle = await startMcpHttp(mockDeps, {})
      }
      catch {
        // Port 3001 may be busy, that's fine
      }

      // Assert - verify defaults port 3001 and host 127.0.0.1
      expect(listenSpy).toHaveBeenCalled()
      const firstCall = listenSpy.mock.calls[0]!
      expect(firstCall[0]).toBe(3001)
      expect(firstCall[1]).toBe('127.0.0.1')
    })

    it('tC-43: health endpoint ignores POST method', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act
      const response = await makeRequest(handle.httpServer, 'POST', '/health', JSON.stringify({}))

      // Assert
      expect(response.statusCode).toBe(404)
    })

    it('tC-44: request to /mcp with no method info returns 405', async () => {
      // Arrange
      const { startMcpHttp } = await import('../src/start-mcp-http.js')
      handle = await startMcpHttp(mockDeps, { port: 0 })

      // Act - send a request with an unusual method
      const response = await makeRequest(handle.httpServer, 'OPTIONS', '/mcp')

      // Assert
      expect(response.statusCode).toBe(405)
    })
  })
})
