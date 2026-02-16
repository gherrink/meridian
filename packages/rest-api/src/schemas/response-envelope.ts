import { z } from '@hono/zod-openapi'

export const ErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
}).openapi('ErrorDetail')

export type ErrorDetail = z.infer<typeof ErrorDetailSchema>

export const ErrorResponseSchema = z.object({
  error: ErrorDetailSchema,
}).openapi('ErrorResponse')

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

export function createSuccessResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
  })
}

export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
}).openapi('PaginationMeta')

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>

export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    pagination: PaginationMetaSchema,
  })
}
