import { z } from 'zod'

export const IssueIdSchema = z.string().uuid().brand<'IssueId'>()
export type IssueId = z.infer<typeof IssueIdSchema>

export const MilestoneIdSchema = z.string().uuid().brand<'MilestoneId'>()
export type MilestoneId = z.infer<typeof MilestoneIdSchema>

export const CommentIdSchema = z.string().uuid().brand<'CommentId'>()
export type CommentId = z.infer<typeof CommentIdSchema>

export const UserIdSchema = z.string().uuid().brand<'UserId'>()
export type UserId = z.infer<typeof UserIdSchema>

export const TagIdSchema = z.string().uuid().brand<'TagId'>()
export type TagId = z.infer<typeof TagIdSchema>
