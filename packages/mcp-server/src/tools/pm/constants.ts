import type { UserId } from '@meridian/core'

export const PM_TAGS: ReadonlySet<string> = new Set(['pm'])

/**
 * Placeholder user ID representing automated system actions.
 * Used as the acting user for PM tool operations until proper
 * authentication is implemented in the MCP server layer.
 */
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000' as UserId
