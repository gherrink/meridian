import { z } from 'zod'

export const ErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
})

export type ErrorDetail = z.infer<typeof ErrorDetailSchema>

export const ErrorResponseSchema = z.object({
  error: ErrorDetailSchema,
})

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
})

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>

export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    pagination: PaginationMetaSchema,
  })
}
