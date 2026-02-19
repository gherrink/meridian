import type { Milestone } from '../model/milestone.js'
import type { MilestoneId, UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IMilestoneRepository } from '../ports/milestone-repository.js'
import type { Result } from './result.js'

import { NotFoundError, ValidationError } from '../errors/domain-errors.js'
import { UpdateMilestoneInputSchema } from '../model/milestone.js'
import { failure, success } from './result.js'

export class UpdateMilestoneUseCase {
  private readonly milestoneRepository: IMilestoneRepository
  private readonly auditLogger: IAuditLogger

  constructor(milestoneRepository: IMilestoneRepository, auditLogger: IAuditLogger) {
    this.milestoneRepository = milestoneRepository
    this.auditLogger = auditLogger
  }

  async execute(id: MilestoneId, input: unknown, userId: UserId): Promise<Result<Milestone, ValidationError | NotFoundError>> {
    const parsed = UpdateMilestoneInputSchema.safeParse(input)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]!
      return failure(new ValidationError(firstIssue.path.join('.'), firstIssue.message))
    }

    try {
      const milestone = await this.milestoneRepository.update(id, parsed.data)

      await this.auditLogger.log('UpdateMilestone', userId, {
        milestoneId: id,
        updatedFields: Object.keys(parsed.data),
      })

      return success(milestone)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(error)
      }
      throw error
    }
  }
}
