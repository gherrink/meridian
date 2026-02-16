import type { Octokit } from './create-octokit.js'

import { createAuditLogger } from '@meridian/shared'

import { loadConfig } from './config/index.js'
import { createOctokit } from './create-octokit.js'

// Side-effect import: loads .env into process.env via dotenv.
// ESM evaluates all imports before module body, so env vars are available
// when loadConfig() executes below regardless of import statement ordering.
import './env.js'

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
} from './config/index.js'

export { ConfigurationError, loadConfig } from './config/index.js'
export type { ConfigurationIssue } from './config/index.js'

export { createOctokit } from './create-octokit.js'
export type { Octokit } from './create-octokit.js'

const config = loadConfig()

export const auditLogger = createAuditLogger({
  level: config.logging.level,
  destinationPath: config.logging.auditLogPath,
})

export const octokitInstance: Octokit | undefined = config.adapter === 'github'
  ? createOctokit(config.github)
  : undefined
