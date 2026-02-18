import { z } from 'zod'

export const ServerConfigSchema = z.object({
  HEART_PORT: z.coerce.number().int().positive().default(3000),
  MCP_TRANSPORT: z.enum(['stdio', 'http', 'both']).default('stdio'),
  MCP_HTTP_PORT: z.coerce.number().int().positive().default(3001),
  MCP_HTTP_HOST: z.string().default('127.0.0.1'),
})

export const LoggingConfigSchema = z.object({
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  AUDIT_LOG_PATH: z.string().min(1).optional(),
})

export const GitHubAdapterConfigSchema = z.object({
  GITHUB_TOKEN: z.string().min(1, 'GitHub token is required'),
  GITHUB_OWNER: z.string().min(1, 'GitHub owner is required'),
  GITHUB_REPO: z.string().min(1, 'GitHub repo is required'),
  GITHUB_MILESTONE_ID: z.string().uuid().optional(),
})

export const LocalAdapterConfigSchema = z.object({
  TRACKER_URL: z.string().url().default('http://localhost:8000'),
})

export const BaseConfigSchema = z.object({
  MERIDIAN_ADAPTER: z.enum(['github', 'local', 'memory']),
})
