import type { McpServerConfig, McpServerDependencies } from '@meridian/mcp-server'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'

import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'

import { createMcpServer } from '@meridian/mcp-server'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'

interface McpSession {
  server: McpServer
  transport: StreamableHTTPServerTransport
}

export interface McpHttpHandle {
  httpServer: Server
  sessions: Map<string, McpSession>
}

export interface McpHttpConfig extends McpServerConfig {
  port?: number
  host?: string
}

const DEFAULT_PORT = 3001
const DEFAULT_HOST = '127.0.0.1'
const MAX_REQUEST_BODY_BYTES = 1024 * 1024

function writeJsonResponse(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}

function collectRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let totalBytes = 0
    request.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        request.destroy(new Error(`Request body exceeds maximum size of ${MAX_REQUEST_BODY_BYTES} bytes`))
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    request.on('error', reject)
  })
}

function handleHealthRequest(_request: IncomingMessage, response: ServerResponse): void {
  writeJsonResponse(response, 200, { status: 'ok' })
}

async function handleMcpSessionRequest(
  request: IncomingMessage,
  response: ServerResponse,
  sessions: Map<string, McpSession>,
): Promise<void> {
  const sessionId = request.headers['mcp-session-id'] as string | undefined

  if (!sessionId || !sessions.has(sessionId)) {
    writeJsonResponse(response, 404, { error: 'Session not found' })
    return
  }

  const session = sessions.get(sessionId)!
  await session.transport.handleRequest(request, response)
}

async function handleMcpPost(
  request: IncomingMessage,
  response: ServerResponse,
  sessions: Map<string, McpSession>,
  dependencies: McpServerDependencies,
  serverConfig?: McpServerConfig,
): Promise<void> {
  const sessionId = request.headers['mcp-session-id'] as string | undefined

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!
    await session.transport.handleRequest(request, response)
    return
  }

  const rawBody = await collectRequestBody(request)
  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  }
  catch {
    writeJsonResponse(response, 400, { error: 'Invalid JSON in request body' })
    return
  }

  if (!isInitializeRequest(parsedBody)) {
    if (sessionId) {
      writeJsonResponse(response, 404, { error: 'Session not found' })
    }
    else {
      writeJsonResponse(response, 400, { error: 'Missing session ID for non-initialization request' })
    }
    return
  }

  const mcpServer = createMcpServer(dependencies, serverConfig)

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (newSessionId: string) => {
      sessions.set(newSessionId, { server: mcpServer, transport })
    },
  })

  transport.onclose = () => {
    const transportSessionId = transport.sessionId
    if (transportSessionId !== undefined) {
      sessions.delete(transportSessionId)
    }
  }

  await mcpServer.connect(transport)
  await transport.handleRequest(request, response, parsedBody)
}

function createRequestListener(
  sessions: Map<string, McpSession>,
  dependencies: McpServerDependencies,
  serverConfig?: McpServerConfig,
): (request: IncomingMessage, response: ServerResponse) => void {
  return (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    const pathname = url.pathname
    const method = request.method?.toUpperCase()

    const handleRequest = async (): Promise<void> => {
      if (pathname === '/health' && method === 'GET') {
        handleHealthRequest(request, response)
        return
      }

      if (pathname === '/mcp') {
        if (method === 'POST') {
          await handleMcpPost(request, response, sessions, dependencies, serverConfig)
          return
        }
        if (method === 'GET' || method === 'DELETE') {
          await handleMcpSessionRequest(request, response, sessions)
          return
        }
        writeJsonResponse(response, 405, { error: `Method ${method ?? 'UNKNOWN'} not allowed on /mcp` })
        return
      }

      writeJsonResponse(response, 404, { error: 'Not found' })
    }

    handleRequest().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`MCP HTTP request error: ${message}`)
      if (!response.headersSent) {
        writeJsonResponse(response, 500, { error: 'Internal server error' })
      }
    })
  }
}

export async function startMcpHttp(
  dependencies: McpServerDependencies,
  config?: McpHttpConfig,
): Promise<McpHttpHandle> {
  const port = config?.port ?? DEFAULT_PORT
  const host = config?.host ?? DEFAULT_HOST
  const sessions = new Map<string, McpSession>()

  const requestListener = createRequestListener(sessions, dependencies, config)
  const httpServer = createServer(requestListener)

  await new Promise<void>((resolve, reject) => {
    httpServer.on('error', reject)
    httpServer.listen(port, host, () => {
      httpServer.removeListener('error', reject)
      resolve()
    })
  })

  return { httpServer, sessions }
}
