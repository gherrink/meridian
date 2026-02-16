import type { McpHttpHandle } from './start-mcp-http.js'
import type { McpStdioHandle } from './start-mcp-stdio.js'

import process from 'node:process'

import { serve } from '@hono/node-server'
import { createRestApiApp } from '@meridian/rest-api'
import { createAuditLogger } from '@meridian/shared'

import { ConfigurationError, loadConfig } from './config/index.js'
import { createAdapters } from './create-adapters.js'
import { createUseCases } from './create-use-cases.js'
import { startMcpHttp } from './start-mcp-http.js'
import { startMcpStdio } from './start-mcp-stdio.js'
import './env.js'

const SHUTDOWN_TIMEOUT_MS = 5000

function logStartupBanner(message: string, stdioMode: boolean): void {
  if (stdioMode) {
    console.error(message)
  }
  else {
    process.stdout.write(`${message}\n`)
  }
}

async function startServer(): Promise<void> {
  const config = loadConfig()

  const isStdioMode = config.server.mcpTransport === 'stdio'
  const isHttpMode = config.server.mcpTransport === 'http'

  const auditLogger = createAuditLogger({
    level: config.logging.level,
    destinationPath: config.logging.auditLogPath,
    stdioMode: isStdioMode,
  })

  const adapters = createAdapters(config)
  const useCases = createUseCases(adapters, auditLogger)

  const mcpDependencies = {
    createIssue: useCases.createIssue,
    listIssues: useCases.listIssues,
    updateIssue: useCases.updateIssue,
    updateStatus: useCases.updateStatus,
    assignIssue: useCases.assignIssue,
    getProjectOverview: useCases.getProjectOverview,
    issueRepository: adapters.issueRepository,
    commentRepository: adapters.commentRepository,
    projectRepository: adapters.projectRepository,
  }

  const app = createRestApiApp({
    auditLogger,
    createIssue: useCases.createIssue,
    listIssues: useCases.listIssues,
    updateIssue: useCases.updateIssue,
    updateStatus: useCases.updateStatus,
    assignIssue: useCases.assignIssue,
    getProjectOverview: useCases.getProjectOverview,
    issueRepository: adapters.issueRepository,
    commentRepository: adapters.commentRepository,
  })

  const server = serve({
    fetch: app.fetch,
    port: config.server.port,
  }, (info) => {
    logStartupBanner(
      `Meridian Heart started | adapter=${config.adapter} port=${info.port} transport=${config.server.mcpTransport}`,
      isStdioMode,
    )
  })

  let mcpStdioHandle: McpStdioHandle | undefined
  let mcpHttpHandle: McpHttpHandle | undefined

  if (isStdioMode) {
    mcpStdioHandle = await startMcpStdio(mcpDependencies)
    console.error(`MCP stdio transport connected | server=meridian`)
  }
  else if (isHttpMode) {
    mcpHttpHandle = await startMcpHttp(mcpDependencies, {
      port: config.server.mcpHttpPort,
      host: config.server.mcpHttpHost,
    })
    process.stdout.write(`MCP HTTP transport listening | host=${config.server.mcpHttpHost} port=${config.server.mcpHttpPort}\n`)
  }

  let closing = false

  function shutdownGracefully(): void {
    if (closing) {
      return
    }
    closing = true

    console.error('Shutting down gracefully...')

    const closeSequence = async (): Promise<void> => {
      if (mcpStdioHandle !== undefined) {
        await mcpStdioHandle.transport.close()
        await mcpStdioHandle.server.close()
      }

      if (mcpHttpHandle !== undefined) {
        for (const [sessionId, session] of mcpHttpHandle.sessions) {
          try {
            await session.transport.close()
            await session.server.close()
          }
          catch (sessionCloseError: unknown) {
            const message = sessionCloseError instanceof Error ? sessionCloseError.message : String(sessionCloseError)
            console.error(`Error closing MCP HTTP session ${sessionId}: ${message}`)
          }
        }
        mcpHttpHandle.sessions.clear()

        await new Promise<void>((resolve) => {
          mcpHttpHandle!.httpServer.close(() => resolve())
        })
      }
    }

    closeSequence()
      .catch((closeError: unknown) => {
        const message = closeError instanceof Error ? closeError.message : String(closeError)
        console.error(`Error during MCP transport shutdown: ${message}`)
      })
      .finally(() => {
        server.close(() => {
          process.exit(0)
        })
      })

    setTimeout(() => {
      console.error('Shutdown timed out, forcing exit')
      process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS).unref()
  }

  if (isStdioMode) {
    process.stdin.on('end', shutdownGracefully)
  }

  process.on('SIGTERM', shutdownGracefully)
  process.on('SIGINT', shutdownGracefully)
}

try {
  startServer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Failed to start MCP server: ${message}`)
    process.exit(1)
  })
}
catch (error) {
  if (error instanceof ConfigurationError) {
    console.error('Failed to start: configuration invalid')
    for (const issue of error.issues) {
      console.error(`  - ${issue.field}: ${issue.message}`)
    }
    process.exit(1)
  }

  const message = error instanceof Error ? error.message : String(error)
  console.error(`Failed to start: ${message}`)
  process.exit(1)
}
