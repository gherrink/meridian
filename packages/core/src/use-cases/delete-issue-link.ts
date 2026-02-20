import type { IssueLinkId } from '../model/value-objects.js'
import type { IIssueLinkRepository } from '../ports/issue-link-repository.js'
import type { Result } from './result.js'

import { NotFoundError } from '../errors/domain-errors.js'
import { failure, success } from './result.js'

export class DeleteIssueLinkUseCase {
  private readonly issueLinkRepository: IIssueLinkRepository

  constructor(issueLinkRepository: IIssueLinkRepository) {
    this.issueLinkRepository = issueLinkRepository
  }

  async execute(id: IssueLinkId): Promise<Result<void, NotFoundError>> {
    const link = await this.issueLinkRepository.findById(id)

    if (!link) {
      return failure(new NotFoundError('IssueLink', id))
    }

    await this.issueLinkRepository.delete(id)
    return success(undefined)
  }
}
