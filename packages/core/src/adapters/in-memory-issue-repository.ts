import type { CreateIssueInput, Issue, UpdateIssueInput } from '../model/issue.js'

import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { IssueId } from '../model/value-objects.js'
import type { IssueFilterParams } from '../ports/issue-filter-params.js'
import type { IIssueRepository } from '../ports/issue-repository.js'
import type { SortOptions } from '../ports/sort-options.js'
import { randomUUID } from 'node:crypto'

import { NotFoundError } from '../errors/domain-errors.js'
import { CreateIssueInputSchema } from '../model/issue.js'
import { applyUpdate } from './apply-update.js'
import { paginate } from './paginate.js'

export class InMemoryIssueRepository implements IIssueRepository {
  private readonly store = new Map<IssueId, Issue>()

  create = async (input: CreateIssueInput): Promise<Issue> => {
    const parsed = CreateIssueInputSchema.parse(input)
    const now = new Date()
    const id = randomUUID() as IssueId

    const issue: Issue = {
      ...parsed,
      id,
      createdAt: now,
      updatedAt: now,
    }

    this.store.set(id, issue)
    return issue
  }

  getById = async (id: IssueId): Promise<Issue> => {
    const issue = this.store.get(id)
    if (!issue) {
      throw new NotFoundError('Issue', id)
    }
    return issue
  }

  update = async (id: IssueId, input: UpdateIssueInput): Promise<Issue> => {
    const existing = this.store.get(id)
    if (!existing) {
      throw new NotFoundError('Issue', id)
    }

    const updated = applyUpdate(existing, input)
    this.store.set(id, updated)
    return updated
  }

  delete = async (id: IssueId): Promise<void> => {
    if (!this.store.has(id)) {
      throw new NotFoundError('Issue', id)
    }
    this.store.delete(id)
  }

  list = async (
    filter: IssueFilterParams,
    pagination: PaginationParams,
    sort?: SortOptions,
  ): Promise<PaginatedResult<Issue>> => {
    const allIssues = Array.from(this.store.values())
    const filtered = this.applyFilters(allIssues, filter)
    return paginate(filtered, pagination, sort)
  }

  seed(issues: Issue[]): void {
    for (const issue of issues) {
      this.store.set(issue.id, issue)
    }
  }

  reset(): void {
    this.store.clear()
  }

  private applyFilters(issues: Issue[], filter: IssueFilterParams): Issue[] {
    return issues.filter((issue) => {
      if (filter.projectId !== undefined && issue.projectId !== filter.projectId)
        return false
      if (filter.status !== undefined && issue.status !== filter.status)
        return false
      if (filter.priority !== undefined && issue.priority !== filter.priority)
        return false
      if (filter.assigneeId !== undefined && !issue.assigneeIds.includes(filter.assigneeId))
        return false
      if (filter.search !== undefined) {
        const query = filter.search.toLowerCase()
        const inTitle = issue.title.toLowerCase().includes(query)
        const inDescription = issue.description.toLowerCase().includes(query)
        if (!inTitle && !inDescription)
          return false
      }
      return true
    })
  }
}
