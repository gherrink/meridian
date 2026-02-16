export type {
  AdapterType,
  GitHubConfig,
  GitHubMeridianConfig,
  LocalConfig,
  LocalMeridianConfig,
  LoggingConfig,
  McpTransport,
  MeridianConfig,
  ServerConfig,
} from './config-types.js'

export { ConfigurationError } from './configuration-error.js'
export type { ConfigurationIssue } from './configuration-error.js'

export { loadConfig } from './load-config.js'
