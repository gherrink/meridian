import type { MilestoneId, UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IMilestoneRepository } from '../ports/milestone-repository.js'
import type { Result } from './result.js'

import { NotFoundError } from '../errors/domain-errors.js'
import { failure, success } from './result.js'

export class DeleteMilestoneUseCase {
  private readonly milestoneRepository: IMilestoneRepository
  private readonly auditLogger: IAuditLogger

  constructor(milestoneRepository: IMilestoneRepository, auditLogger: IAuditLogger) {
    this.milestoneRepository = milestoneRepository
    this.auditLogger = auditLogger
  }

  async execute(id: MilestoneId, userId: UserId): Promise<Result<void, NotFoundError>> {
    try {
      await this.milestoneRepository.delete(id)

      await this.auditLogger.log('DeleteMilestone', userId, {
        milestoneId: id,
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
