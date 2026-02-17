import type { Project } from '../model/project.js'
import type { UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IProjectRepository } from '../ports/project-repository.js'
import type { Result } from './result.js'

import { ConflictError, ValidationError } from '../errors/domain-errors.js'
import { CreateProjectInputSchema } from '../model/project.js'
import { failure, success } from './result.js'

export class CreateProjectUseCase {
  private readonly projectRepository: IProjectRepository
  private readonly auditLogger: IAuditLogger

  constructor(projectRepository: IProjectRepository, auditLogger: IAuditLogger) {
    this.projectRepository = projectRepository
    this.auditLogger = auditLogger
  }

  async execute(input: unknown, userId: UserId): Promise<Result<Project, ValidationError | ConflictError>> {
    const parsed = CreateProjectInputSchema.safeParse(input)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]!
      return failure(new ValidationError(firstIssue.path.join('.'), firstIssue.message))
    }

    try {
      const project = await this.projectRepository.create(parsed.data)

      await this.auditLogger.log('CreateProject', userId, {
        projectId: project.id,
      })

      return success(project)
    }
    catch (error) {
      if (error instanceof ConflictError) {
        return failure(error)
      }
      throw error
    }
  }
}
