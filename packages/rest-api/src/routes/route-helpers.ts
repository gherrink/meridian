import type { UserId } from '@meridian/core'

import { z } from '@hono/zod-openapi'

const UserIdHeaderSchema = z.string().uuid()

const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000'

export function parseUserId(headerValue: string | undefined): UserId {
  const parsed = UserIdHeaderSchema.safeParse(headerValue)
  return (parsed.success ? parsed.data : ANONYMOUS_USER_ID) as UserId
}

export function unwrapResultOrThrow<T>(result: { ok: true, value: T } | { ok: false, error: Error }): T {
  if (!result.ok) {
    throw result.error
  }
  return result.value
}

export function transformDueDateToDate(dueDate: string | null | undefined): Date | null | undefined {
  if (dueDate === undefined) {
    return undefined
  }
  return dueDate === null ? null : new Date(dueDate)
}
