import type { CreateMilestoneInput, Milestone, UpdateMilestoneInput } from '../model/milestone.js'
import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { MilestoneId } from '../model/value-objects.js'
import type { IMilestoneRepository } from '../ports/milestone-repository.js'
import type { SortOptions } from '../ports/sort-options.js'
import { randomUUID } from 'node:crypto'

import { NotFoundError } from '../errors/domain-errors.js'
import { CreateMilestoneInputSchema } from '../model/milestone.js'
import { applyUpdate } from './apply-update.js'
import { paginate } from './paginate.js'

export class InMemoryMilestoneRepository implements IMilestoneRepository {
  private readonly store = new Map<MilestoneId, Milestone>()

  create = async (input: CreateMilestoneInput): Promise<Milestone> => {
    const parsed = CreateMilestoneInputSchema.parse(input)
    const now = new Date()
    const id = randomUUID() as MilestoneId

    const milestone: Milestone = {
      ...parsed,
      id,
      createdAt: now,
      updatedAt: now,
    }

    this.store.set(id, milestone)
    return milestone
  }

  getById = async (id: MilestoneId): Promise<Milestone> => {
    const milestone = this.store.get(id)
    if (!milestone) {
      throw new NotFoundError('Milestone', id)
    }
    return milestone
  }

  update = async (id: MilestoneId, input: UpdateMilestoneInput): Promise<Milestone> => {
    const existing = this.store.get(id)
    if (!existing) {
      throw new NotFoundError('Milestone', id)
    }

    const updated = applyUpdate(existing, input)
    this.store.set(id, updated)
    return updated
  }

  delete = async (id: MilestoneId): Promise<void> => {
    if (!this.store.has(id)) {
      throw new NotFoundError('Milestone', id)
    }
    this.store.delete(id)
  }

  list = async (pagination: PaginationParams, sort?: SortOptions): Promise<PaginatedResult<Milestone>> => {
    const allMilestones = Array.from(this.store.values())
    return paginate(allMilestones, pagination, sort)
  }

  seed(milestones: Milestone[]): void {
    for (const milestone of milestones) {
      this.store.set(milestone.id, milestone)
    }
  }

  reset(): void {
    this.store.clear()
  }
}
