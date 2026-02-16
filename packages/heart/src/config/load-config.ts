import type { AdapterType, GitHubConfig, GitHubMeridianConfig, LocalConfig, LocalMeridianConfig, LoggingConfig, MemoryMeridianConfig, MeridianConfig, ServerConfig } from './config-types.js'
import type { ConfigurationIssue } from './configuration-error.js'

import process from 'node:process'

import { ZodError } from 'zod'

import {
  BaseConfigSchema,
  GitHubAdapterConfigSchema,
  LocalAdapterConfigSchema,
  LoggingConfigSchema,
  ServerConfigSchema,
} from './config-schema.js'
import { ConfigurationError } from './configuration-error.js'

function mapZodIssuesToConfigurationIssues(zodError: ZodError): ConfigurationIssue[] {
  return zodError.issues.map(issue => ({
    field: issue.path.join('.') || 'unknown',
    message: issue.message,
  }))
}

function parseServerConfig(env: Record<string, string | undefined>): ServerConfig {
  const parsed = ServerConfigSchema.parse(env)
  return Object.freeze({
    port: parsed.HEART_PORT,
    mcpTransport: parsed.MCP_TRANSPORT,
    mcpHttpPort: parsed.MCP_HTTP_PORT,
  })
}

function parseLoggingConfig(env: Record<string, string | undefined>): LoggingConfig {
  const parsed = LoggingConfigSchema.parse(env)
  return Object.freeze({
    level: parsed.LOG_LEVEL,
    auditLogPath: parsed.AUDIT_LOG_PATH,
  })
}

function parseGitHubConfig(env: Record<string, string | undefined>): GitHubConfig {
  const parsed = GitHubAdapterConfigSchema.parse(env)
  return Object.freeze({
    token: parsed.GITHUB_TOKEN,
    owner: parsed.GITHUB_OWNER,
    repo: parsed.GITHUB_REPO,
    projectId: parsed.GITHUB_PROJECT_ID,
  })
}

function parseLocalConfig(env: Record<string, string | undefined>): LocalConfig {
  const parsed = LocalAdapterConfigSchema.parse(env)
  return Object.freeze({
    trackerUrl: parsed.TRACKER_URL,
  })
}

export function loadConfig(env: Record<string, string | undefined> = process.env): MeridianConfig {
  const configurationIssues: ConfigurationIssue[] = []

  let adapterType: AdapterType
  try {
    const base = BaseConfigSchema.parse(env)
    adapterType = base.MERIDIAN_ADAPTER
  }
  catch (error) {
    if (error instanceof ZodError) {
      configurationIssues.push(...mapZodIssuesToConfigurationIssues(error))
    }
    throw new ConfigurationError(
      configurationIssues.length > 0
        ? configurationIssues
        : [{ field: 'MERIDIAN_ADAPTER', message: 'Failed to parse adapter configuration' }],
    )
  }

  let server: ServerConfig | undefined
  let logging: LoggingConfig | undefined

  try {
    server = parseServerConfig(env)
  }
  catch (error) {
    if (error instanceof ZodError) {
      configurationIssues.push(...mapZodIssuesToConfigurationIssues(error))
    }
    else {
      throw error
    }
  }

  try {
    logging = parseLoggingConfig(env)
  }
  catch (error) {
    if (error instanceof ZodError) {
      configurationIssues.push(...mapZodIssuesToConfigurationIssues(error))
    }
    else {
      throw error
    }
  }

  if (adapterType === 'github') {
    let github: GitHubConfig | undefined
    try {
      github = parseGitHubConfig(env)
    }
    catch (error) {
      if (error instanceof ZodError) {
        configurationIssues.push(...mapZodIssuesToConfigurationIssues(error))
      }
      else {
        throw error
      }
    }

    if (configurationIssues.length > 0) {
      throw new ConfigurationError(configurationIssues)
    }

    return Object.freeze({
      adapter: 'github',
      server: server!,
      logging: logging!,
      github: github!,
    }) satisfies GitHubMeridianConfig
  }

  if (adapterType === 'local') {
    let local: LocalConfig | undefined
    try {
      local = parseLocalConfig(env)
    }
    catch (error) {
      if (error instanceof ZodError) {
        configurationIssues.push(...mapZodIssuesToConfigurationIssues(error))
      }
      else {
        throw error
      }
    }

    if (configurationIssues.length > 0) {
      throw new ConfigurationError(configurationIssues)
    }

    return Object.freeze({
      adapter: 'local',
      server: server!,
      logging: logging!,
      local: local!,
    }) satisfies LocalMeridianConfig
  }

  if (configurationIssues.length > 0) {
    throw new ConfigurationError(configurationIssues)
  }

  return Object.freeze({
    adapter: 'memory',
    server: server!,
    logging: logging!,
  }) satisfies MemoryMeridianConfig
}
