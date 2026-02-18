import type { Milestone } from '../model/milestone.js'
import type { UserId } from '../model/value-objects.js'
import type { IAuditLogger } from '../ports/audit-logger.js'
import type { IMilestoneRepository } from '../ports/milestone-repository.js'
import type { Result } from './result.js'

import { ConflictError, ValidationError } from '../errors/domain-errors.js'
import { CreateMilestoneInputSchema } from '../model/milestone.js'
import { failure, success } from './result.js'

export class CreateMilestoneUseCase {
  private readonly milestoneRepository: IMilestoneRepository
  private readonly auditLogger: IAuditLogger

  constructor(milestoneRepository: IMilestoneRepository, auditLogger: IAuditLogger) {
    this.milestoneRepository = milestoneRepository
    this.auditLogger = auditLogger
  }

  async execute(input: unknown, userId: UserId): Promise<Result<Milestone, ValidationError | ConflictError>> {
    const parsed = CreateMilestoneInputSchema.safeParse(input)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]!
      return failure(new ValidationError(firstIssue.path.join('.'), firstIssue.message))
    }

    try {
      const milestone = await this.milestoneRepository.create(parsed.data)

      await this.auditLogger.log('CreateMilestone', userId, {
        milestoneId: milestone.id,
      })

      return success(milestone)
    }
    catch (error) {
      if (error instanceof ConflictError) {
        return failure(error)
      }
      throw error
    }
  }
}
