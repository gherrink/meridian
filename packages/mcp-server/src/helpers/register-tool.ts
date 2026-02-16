import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { z } from 'zod'

import { formatErrorResponse, formatUnknownErrorResponse, isDomainError } from './format-response.js'

type ToolHandlerExtra = Parameters<ToolCallback<z.ZodRawShape>>[1]

interface ToolConfig<TSchema extends z.ZodRawShape | undefined = undefined> {
  title: string
  description: string
  inputSchema?: TSchema
}

type HandlerArgs<TSchema>
  = TSchema extends z.ZodRawShape ? { [K in keyof TSchema]: z.infer<TSchema[K]> } : Record<string, never>

export type { ToolHandlerExtra }

export function registerTool<TSchema extends z.ZodRawShape | undefined = undefined>(
  server: McpServer,
  name: string,
  config: ToolConfig<TSchema>,
  handler: (args: HandlerArgs<TSchema>, extra: ToolHandlerExtra) => Promise<CallToolResult>,
): void {
  const wrappedHandler = (async (argsOrExtra: HandlerArgs<TSchema> | ToolHandlerExtra, maybeExtra?: ToolHandlerExtra): Promise<CallToolResult> => {
    try {
      if (config.inputSchema) {
        const args = argsOrExtra as HandlerArgs<TSchema>
        const extra = maybeExtra as ToolHandlerExtra
        return await handler(args, extra)
      }
      const extra = argsOrExtra as ToolHandlerExtra
      return await handler({} as HandlerArgs<TSchema>, extra)
    }
    catch (error: unknown) {
      if (isDomainError(error)) {
        return formatErrorResponse(error)
      }
      return formatUnknownErrorResponse(error)
    }
  }) as ToolCallback<TSchema>

  server.registerTool(name, {
    title: config.title,
    description: config.description,
    inputSchema: config.inputSchema,
  }, wrappedHandler)
}
