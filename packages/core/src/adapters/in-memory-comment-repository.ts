import type { Comment, CreateCommentInput, UpdateCommentInput } from '../model/comment.js'

import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { CommentId, IssueId } from '../model/value-objects.js'
import type { ICommentRepository } from '../ports/comment-repository.js'
import type { SortOptions } from '../ports/sort-options.js'
import { randomUUID } from 'node:crypto'

import { NotFoundError } from '../errors/domain-errors.js'
import { CreateCommentInputSchema } from '../model/comment.js'
import { applyUpdate } from './apply-update.js'
import { paginate } from './paginate.js'

export class InMemoryCommentRepository implements ICommentRepository {
  private readonly store = new Map<CommentId, Comment>()

  create = async (input: CreateCommentInput): Promise<Comment> => {
    const parsed = CreateCommentInputSchema.parse(input)
    const now = new Date()
    const id = randomUUID() as CommentId

    const comment: Comment = {
      ...parsed,
      id,
      createdAt: now,
      updatedAt: now,
    }

    this.store.set(id, comment)
    return comment
  }

  getByIssueId = async (
    issueId: IssueId,
    pagination: PaginationParams,
    sort?: SortOptions,
  ): Promise<PaginatedResult<Comment>> => {
    const commentsForIssue = Array.from(this.store.values())
      .filter(comment => comment.issueId === issueId)
    return paginate(commentsForIssue, pagination, sort)
  }

  update = async (id: CommentId, input: UpdateCommentInput): Promise<Comment> => {
    const existing = this.store.get(id)
    if (!existing) {
      throw new NotFoundError('Comment', id)
    }

    const updated = applyUpdate(existing, input)
    this.store.set(id, updated)
    return updated
  }

  delete = async (id: CommentId): Promise<void> => {
    if (!this.store.has(id)) {
      throw new NotFoundError('Comment', id)
    }
    this.store.delete(id)
  }

  seed(comments: Comment[]): void {
    for (const comment of comments) {
      this.store.set(comment.id, comment)
    }
  }

  reset(): void {
    this.store.clear()
  }
}
