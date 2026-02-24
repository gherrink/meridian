import pino from 'pino'

export const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const

export const DEFAULT_REDACT_PATHS = [
  'metadata.token',
  'metadata.password',
  'metadata.credentials',
  'metadata.secret',
  'metadata.authorization',
]

export const STDOUT_FD = 1
export const STDERR_FD = 2

export function isValidLogLevel(level: string): level is typeof VALID_LOG_LEVELS[number] {
  return (VALID_LOG_LEVELS as readonly string[]).includes(level)
}

export function resolveDestination(destinationPath: string | undefined, stdioMode: boolean | undefined): pino.DestinationStream {
  if (destinationPath !== undefined) {
    return pino.destination(destinationPath)
  }

  if (stdioMode === true) {
    return pino.destination(STDERR_FD)
  }

  return pino.destination(STDOUT_FD)
}
