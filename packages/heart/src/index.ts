import { createAuditLogger } from '@meridian/shared'

import { loadConfig } from './config/index.js'

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

const config = loadConfig()

export const auditLogger = createAuditLogger({
  level: config.logging.level,
  destinationPath: config.logging.auditLogPath,
})
