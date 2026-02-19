import type { Epic } from '../model/epic.js'
import type { EpicId, UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IEpicRepository } from '../ports/epic-repository.js'
import type { Result } from './result.js'

import { NotFoundError, ValidationError } from '../errors/domain-errors.js'
import { UpdateEpicInputSchema } from '../model/epic.js'
import { failure, success } from './result.js'

export class UpdateEpicUseCase {
  private readonly epicRepository: IEpicRepository
  private readonly auditLogger: IAuditLogger

  constructor(epicRepository: IEpicRepository, auditLogger: IAuditLogger) {
    this.epicRepository = epicRepository
    this.auditLogger = auditLogger
  }

  async execute(id: EpicId, input: unknown, userId: UserId): Promise<Result<Epic, ValidationError | NotFoundError>> {
    const parsed = UpdateEpicInputSchema.safeParse(input)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]!
      return failure(new ValidationError(firstIssue.path.join('.'), firstIssue.message))
    }

    try {
      const epic = await this.epicRepository.update(id, parsed.data)

      await this.auditLogger.log('UpdateEpic', userId, {
        epicId: id,
        updatedFields: Object.keys(parsed.data),
      })

      return success(epic)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(error)
      }
      throw error
    }
  }
}
