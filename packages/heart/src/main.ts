import type { McpHttpHandle } from './start-mcp-http.js'
import type { McpStdioHandle } from './start-mcp-stdio.js'

import process from 'node:process'

import { serve } from '@hono/node-server'
import { createRestApiApp } from '@meridian/rest-api'
import { createAuditLogger, createLogger } from '@meridian/shared'

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

  const mcpTransport = config.server.mcpTransport
  const useStdioLogging = mcpTransport === 'stdio' || mcpTransport === 'both'

  const auditLogger = createAuditLogger({
    level: config.logging.level,
    destinationPath: config.logging.auditLogPath,
    stdioMode: useStdioLogging,
  })

  const logger = createLogger({
    level: config.logging.level,
    stdioMode: useStdioLogging,
  })

  const adapters = createAdapters(config, logger)
  const useCases = createUseCases(adapters, auditLogger)

  const mcpDependencies = {
    createIssue: useCases.createIssue,
    createMilestone: useCases.createMilestone,
    listIssues: useCases.listIssues,
    updateIssue: useCases.updateIssue,
    updateState: useCases.updateState,
    assignIssue: useCases.assignIssue,
    getMilestoneOverview: useCases.getMilestoneOverview,
    listMilestones: useCases.listMilestones,
    updateMilestone: useCases.updateMilestone,
    deleteMilestone: useCases.deleteMilestone,
    deleteIssue: useCases.deleteIssue,
    reparentIssue: useCases.reparentIssue,
    createComment: useCases.createComment,
    updateComment: useCases.updateComment,
    deleteComment: useCases.deleteComment,
    getCommentsByIssue: useCases.getCommentsByIssue,
    createIssueLink: useCases.createIssueLink,
    deleteIssueLink: useCases.deleteIssueLink,
    listIssueLinks: useCases.listIssueLinks,
    issueRepository: adapters.issueRepository,
    commentRepository: adapters.commentRepository,
    milestoneRepository: adapters.milestoneRepository,
    auditLogger,
  }

  const app = createRestApiApp({
    auditLogger,
    issueRepository: adapters.issueRepository,
    milestoneRepository: adapters.milestoneRepository,
    userRepository: adapters.userRepository,
    commentRepository: adapters.commentRepository,
    createIssue: useCases.createIssue,
    listIssues: useCases.listIssues,
    updateIssue: useCases.updateIssue,
    deleteIssue: useCases.deleteIssue,
    reparentIssue: useCases.reparentIssue,
    updateState: useCases.updateState,
    assignIssue: useCases.assignIssue,
    createMilestone: useCases.createMilestone,
    getMilestoneOverview: useCases.getMilestoneOverview,
    listMilestones: useCases.listMilestones,
    updateMilestone: useCases.updateMilestone,
    deleteMilestone: useCases.deleteMilestone,
    createIssueLink: useCases.createIssueLink,
    deleteIssueLink: useCases.deleteIssueLink,
    listIssueLinks: useCases.listIssueLinks,
  })

  const server = serve({
    fetch: app.fetch,
    port: config.server.port,
  }, (info) => {
    logStartupBanner(
      `Meridian Heart started | adapter=${config.adapter} port=${info.port} transport=${mcpTransport}`,
      useStdioLogging,
    )
  })

  let mcpStdioHandle: McpStdioHandle | undefined
  let mcpHttpHandle: McpHttpHandle | undefined

  if (mcpTransport === 'stdio') {
    mcpStdioHandle = await startMcpStdio(mcpDependencies)
    console.error(`MCP stdio transport connected | server=meridian`)
  }
  else if (mcpTransport === 'both') {
    mcpStdioHandle = await startMcpStdio(mcpDependencies)
    console.error(`MCP stdio transport connected | server=meridian`)

    try {
      mcpHttpHandle = await startMcpHttp(mcpDependencies, {
        port: config.server.mcpHttpPort,
        host: config.server.mcpHttpHost,
      })
      console.error(`MCP HTTP transport listening | host=${config.server.mcpHttpHost} port=${config.server.mcpHttpPort}`)
    }
    catch (httpStartError: unknown) {
      await mcpStdioHandle.transport.close()
      await mcpStdioHandle.server.close()
      throw httpStartError
    }
  }
  else if (mcpTransport === 'http') {
    mcpHttpHandle = await startMcpHttp(mcpDependencies, {
      port: config.server.mcpHttpPort,
      host: config.server.mcpHttpHost,
    })
    process.stdout.write(`MCP HTTP transport listening | host=${config.server.mcpHttpHost} port=${config.server.mcpHttpPort}\n`)
  }
  else {
    const unhandledTransport: never = mcpTransport
    throw new Error(`Unsupported MCP transport: ${String(unhandledTransport)}`)
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
        const httpHandle = mcpHttpHandle
        for (const [sessionId, session] of httpHandle.sessions) {
          try {
            await session.transport.close()
            await session.server.close()
          }
          catch (sessionCloseError: unknown) {
            const message = sessionCloseError instanceof Error ? sessionCloseError.message : String(sessionCloseError)
            console.error(`Error closing MCP HTTP session ${sessionId}: ${message}`)
          }
        }
        httpHandle.sessions.clear()

        await new Promise<void>((resolve) => {
          httpHandle.httpServer.close(() => resolve())
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

  if (useStdioLogging) {
    process.stdin.on('end', shutdownGracefully)
  }

  process.on('SIGTERM', shutdownGracefully)
  process.on('SIGINT', shutdownGracefully)
}

try {
  startServer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Failed to start Meridian Heart: ${message}`)
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
