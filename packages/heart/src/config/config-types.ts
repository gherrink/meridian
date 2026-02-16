export type AdapterType = 'github' | 'local'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export type McpTransport = 'stdio' | 'http'

export interface ServerConfig {
  readonly port: number
  readonly mcpTransport: McpTransport
  readonly mcpHttpPort: number
}

export interface LoggingConfig {
  readonly level: LogLevel
  readonly auditLogPath?: string
}

export interface GitHubConfig {
  readonly token: string
  readonly owner: string
  readonly repo: string
  readonly projectId?: string
}

export interface LocalConfig {
  readonly trackerUrl: string
}

export interface GitHubMeridianConfig {
  readonly adapter: 'github'
  readonly server: ServerConfig
  readonly logging: LoggingConfig
  readonly github: GitHubConfig
}

export interface LocalMeridianConfig {
  readonly adapter: 'local'
  readonly server: ServerConfig
  readonly logging: LoggingConfig
  readonly local: LocalConfig
}

export type MeridianConfig = GitHubMeridianConfig | LocalMeridianConfig
