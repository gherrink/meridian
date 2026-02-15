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

export interface AuditLoggerOptions {
  level?: string
  destinationPath?: string
  redactPaths?: string[]
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

  const destination = destinationPath !== undefined
    ? pino.destination(destinationPath)
    : pino.destination(1)

  const logger = pino(pinoOptions, destination)

  return new PinoAuditLogger(logger)
}

function isValidLogLevel(level: string): level is typeof VALID_LOG_LEVELS[number] {
  return (VALID_LOG_LEVELS as readonly string[]).includes(level)
}
