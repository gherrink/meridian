import type { ILogger } from '@meridian/core'

import process from 'node:process'

import pino from 'pino'

import { DEFAULT_REDACT_PATHS, isValidLogLevel, resolveDestination } from './pino-common.js'

export interface LoggerOptions {
  level?: string
  destinationPath?: string
  redactPaths?: string[]
  stdioMode?: boolean
}

export class PinoLogger implements ILogger {
  private readonly logger: pino.Logger

  constructor(logger: pino.Logger) {
    this.logger = logger
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(meta ?? {}, message)
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(meta ?? {}, message)
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(meta ?? {}, message)
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(meta ?? {}, message)
  }

  child(bindings: Record<string, unknown>): ILogger {
    return new PinoLogger(this.logger.child(bindings))
  }
}

export function createLogger(options?: LoggerOptions): PinoLogger {
  // eslint-disable-next-line dot-notation -- process.env requires bracket notation for TS index signatures
  const envLevel = process.env['LOG_LEVEL']

  const requestedLevel = options?.level ?? envLevel ?? 'info'
  const level = isValidLogLevel(requestedLevel) ? requestedLevel : 'info'
  const redactPaths = options?.redactPaths ?? DEFAULT_REDACT_PATHS

  const pinoOptions: pino.LoggerOptions = {
    level,
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
    },
  }

  const destination = resolveDestination(options?.destinationPath, options?.stdioMode)
  const logger = pino(pinoOptions, destination)

  return new PinoLogger(logger)
}
