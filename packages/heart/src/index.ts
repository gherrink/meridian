// Side-effect import: loads .env into process.env via dotenv.
// ESM evaluates all imports before module body, so env vars are available
// when loadConfig() executes regardless of import statement ordering.
import './env.js'

export type {
  AdapterType,
  GitHubConfig,
  GitHubMeridianConfig,
  LocalConfig,
  LocalMeridianConfig,
  LoggingConfig,
  McpTransport,
  MemoryMeridianConfig,
  MeridianConfig,
  ServerConfig,
} from './config/index.js'

export { ConfigurationError, loadConfig } from './config/index.js'
export type { ConfigurationIssue } from './config/index.js'

export { createAdapters } from './create-adapters.js'
export type { AdapterSet } from './create-adapters.js'

export { createOctokit } from './create-octokit.js'
export type { Octokit } from './create-octokit.js'

export { createUseCases } from './create-use-cases.js'
export type { UseCaseSet } from './create-use-cases.js'
