import type { IAuditLogger, UserId } from '@meridian/core'

import process from 'node:process'

import pino from 'pino'

const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const

const DEFAULT_REDACT_PATHS = [
  'metadata.token',
  'metadata.password',
  'metadata.credentials',
  'metadata.secret',
  'metadata.authorization',
]

const STDOUT_FD = 1
const STDERR_FD = 2

export interface AuditLoggerOptions {
  level?: string
  destinationPath?: string
  redactPaths?: string[]
  stdioMode?: boolean
}

export class PinoAuditLogger implements IAuditLogger {
  private readonly logger: pino.Logger

  constructor(logger: pino.Logger) {
    this.logger = logger
  }

  log = async (operation: string, userId: UserId, metadata?: Record<string, unknown>): Promise<void> => {
    this.logger.info({ operation, userId, metadata, audit: true })
  }
}

export function createAuditLogger(options?: AuditLoggerOptions): PinoAuditLogger {
  // eslint-disable-next-line dot-notation -- process.env requires bracket notation for TS index signatures
  const envLevel = process.env['LOG_LEVEL']
  // eslint-disable-next-line dot-notation -- process.env requires bracket notation for TS index signatures
  const envDestination = process.env['AUDIT_LOG_PATH']

  const requestedLevel = options?.level ?? envLevel ?? 'info'
  const level = isValidLogLevel(requestedLevel) ? requestedLevel : 'info'
  const destinationPath = options?.destinationPath ?? envDestination
  const redactPaths = options?.redactPaths ?? DEFAULT_REDACT_PATHS

  const pinoOptions: pino.LoggerOptions = {
    level,
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
    },
  }

  const destination = resolveDestination(destinationPath, options?.stdioMode)
  const logger = pino(pinoOptions, destination)

  return new PinoAuditLogger(logger)
}

function resolveDestination(destinationPath: string | undefined, stdioMode: boolean | undefined): pino.DestinationStream {
  if (destinationPath !== undefined) {
    return pino.destination(destinationPath)
  }

  if (stdioMode === true) {
    return pino.destination(STDERR_FD)
  }

  return pino.destination(STDOUT_FD)
}

function isValidLogLevel(level: string): level is typeof VALID_LOG_LEVELS[number] {
  return (VALID_LOG_LEVELS as readonly string[]).includes(level)
}
