import type { Epic } from '../model/epic.js'
import type { UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IEpicRepository } from '../ports/epic-repository.js'
import type { Result } from './result.js'

import { ConflictError, ValidationError } from '../errors/domain-errors.js'
import { CreateEpicInputSchema } from '../model/epic.js'
import { failure, success } from './result.js'

export class CreateEpicUseCase {
  private readonly epicRepository: IEpicRepository
  private readonly auditLogger: IAuditLogger

  constructor(epicRepository: IEpicRepository, auditLogger: IAuditLogger) {
    this.epicRepository = epicRepository
    this.auditLogger = auditLogger
  }

  async execute(input: unknown, userId: UserId): Promise<Result<Epic, ValidationError | ConflictError>> {
    const parsed = CreateEpicInputSchema.safeParse(input)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]!
      return failure(new ValidationError(firstIssue.path.join('.'), firstIssue.message))
    }

    try {
      const epic = await this.epicRepository.create(parsed.data)

      await this.auditLogger.log('CreateEpic', userId, {
        epicId: epic.id,
        milestoneId: epic.milestoneId,
      })

      return success(epic)
    }
    catch (error) {
      if (error instanceof ConflictError) {
        return failure(error)
      }
      throw error
    }
  }
}
