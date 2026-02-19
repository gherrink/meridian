import type { CreateEpicInput, Epic, UpdateEpicInput } from '../model/epic.js'
import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { EpicId } from '../model/value-objects.js'
import type { IEpicRepository } from '../ports/epic-repository.js'
import type { SortOptions } from '../ports/sort-options.js'
import { randomUUID } from 'node:crypto'

import { NotFoundError } from '../errors/domain-errors.js'
import { CreateEpicInputSchema } from '../model/epic.js'
import { applyUpdate } from './apply-update.js'
import { paginate } from './paginate.js'

export class InMemoryEpicRepository implements IEpicRepository {
  private readonly store = new Map<EpicId, Epic>()

  create = async (input: CreateEpicInput): Promise<Epic> => {
    const parsed = CreateEpicInputSchema.parse(input)
    const now = new Date()
    const id = randomUUID() as EpicId

    const epic: Epic = {
      ...parsed,
      id,
      createdAt: now,
      updatedAt: now,
    }

    this.store.set(id, epic)
    return epic
  }

  getById = async (id: EpicId): Promise<Epic> => {
    const epic = this.store.get(id)
    if (!epic) {
      throw new NotFoundError('Epic', id)
    }
    return epic
  }

  update = async (id: EpicId, input: UpdateEpicInput): Promise<Epic> => {
    const existing = this.store.get(id)
    if (!existing) {
      throw new NotFoundError('Epic', id)
    }

    const updated = applyUpdate(existing, input)
    this.store.set(id, updated)
    return updated
  }

  delete = async (id: EpicId): Promise<void> => {
    if (!this.store.has(id)) {
      throw new NotFoundError('Epic', id)
    }
    this.store.delete(id)
  }

  list = async (pagination: PaginationParams, sort?: SortOptions): Promise<PaginatedResult<Epic>> => {
    const allEpics = Array.from(this.store.values())
    return paginate(allEpics, pagination, sort)
  }

  seed(epics: Epic[]): void {
    for (const epic of epics) {
      this.store.set(epic.id, epic)
    }
  }

  reset(): void {
    this.store.clear()
  }
}
