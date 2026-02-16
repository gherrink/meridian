import process from 'node:process'

import { serve } from '@hono/node-server'
import { createRestApiApp } from '@meridian/rest-api'
import { createAuditLogger } from '@meridian/shared'

import { ConfigurationError, loadConfig } from './config/index.js'
import { createAdapters } from './create-adapters.js'
import { createUseCases } from './create-use-cases.js'
import './env.js'

function startServer(): void {
  const config = loadConfig()

  const auditLogger = createAuditLogger({
    level: config.logging.level,
    destinationPath: config.logging.auditLogPath,
  })

  const adapters = createAdapters(config)
  const useCases = createUseCases(adapters, auditLogger)

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
    // eslint-disable-next-line no-console -- startup banner for operator visibility
    console.info(
      `Meridian Heart started | adapter=${config.adapter} port=${info.port} transport=HTTP`,
    )
  })

  function shutdownGracefully(): void {
    // eslint-disable-next-line no-console -- shutdown visibility for operators
    console.info('Shutting down gracefully...')
    server.close(() => {
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdownGracefully)
  process.on('SIGINT', shutdownGracefully)
}

try {
  startServer()
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
