import type { EpicId, UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IEpicRepository } from '../ports/epic-repository.js'
import type { Result } from './result.js'

import { NotFoundError } from '../errors/domain-errors.js'
import { failure, success } from './result.js'

export class DeleteEpicUseCase {
  private readonly epicRepository: IEpicRepository
  private readonly auditLogger: IAuditLogger

  constructor(epicRepository: IEpicRepository, auditLogger: IAuditLogger) {
    this.epicRepository = epicRepository
    this.auditLogger = auditLogger
  }

  async execute(id: EpicId, userId: UserId): Promise<Result<void, NotFoundError>> {
    try {
      await this.epicRepository.delete(id)

      await this.auditLogger.log('DeleteEpic', userId, {
        epicId: id,
      })

      return success(undefined)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(error)
      }
      throw error
    }
  }
}
