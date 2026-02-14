import { randomUUID } from 'node:crypto'

import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { CreateProjectInput, Project, UpdateProjectInput } from '../model/project.js'
import type { ProjectId } from '../model/value-objects.js'
import type { IProjectRepository } from '../ports/project-repository.js'
import type { SortOptions } from '../ports/sort-options.js'

import { NotFoundError } from '../errors/domain-errors.js'
import { CreateProjectInputSchema } from '../model/project.js'
import { paginate } from './paginate.js'

export class InMemoryProjectRepository implements IProjectRepository {
  private readonly store = new Map<ProjectId, Project>()

  create = async (input: CreateProjectInput): Promise<Project> => {
    const parsed = CreateProjectInputSchema.parse(input)
    const now = new Date()
    const id = randomUUID() as ProjectId

    const project: Project = {
      ...parsed,
      id,
      createdAt: now,
      updatedAt: now,
    }

    this.store.set(id, project)
    return project
  }

  getById = async (id: ProjectId): Promise<Project> => {
    const project = this.store.get(id)
    if (!project) {
      throw new NotFoundError('Project', id)
    }
    return project
  }

  update = async (id: ProjectId, input: UpdateProjectInput): Promise<Project> => {
    const existing = this.store.get(id)
    if (!existing) {
      throw new NotFoundError('Project', id)
    }

    const updated = this.applyUpdate(existing, input)
    this.store.set(id, updated)
    return updated
  }

  delete = async (id: ProjectId): Promise<void> => {
    if (!this.store.has(id)) {
      throw new NotFoundError('Project', id)
    }
    this.store.delete(id)
  }

  list = async (pagination: PaginationParams, sort?: SortOptions): Promise<PaginatedResult<Project>> => {
    const allProjects = Array.from(this.store.values())
    return paginate(allProjects, pagination, sort)
  }

  seed(projects: Project[]): void {
    for (const project of projects) {
      this.store.set(project.id, project)
    }
  }

  reset(): void {
    this.store.clear()
  }

  private applyUpdate(existing: Project, input: UpdateProjectInput): Project {
    const updated = { ...existing }

    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        (updated as Record<string, unknown>)[key] = value
      }
    }

    updated.updatedAt = new Date()
    return updated
  }
}
