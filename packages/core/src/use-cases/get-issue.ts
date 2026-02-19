import type { Issue } from '../model/issue.js'
import type { IssueId } from '../model/value-objects.js'
import type { IIssueRepository } from '../ports/issue-repository.js'
import type { Result } from './result.js'

import { NotFoundError } from '../errors/domain-errors.js'
import { failure, success } from './result.js'

export class GetIssueUseCase {
  private readonly issueRepository: IIssueRepository

  constructor(issueRepository: IIssueRepository) {
    this.issueRepository = issueRepository
  }

  async execute(id: IssueId): Promise<Result<Issue, NotFoundError>> {
    try {
      const issue = await this.issueRepository.getById(id)
      return success(issue)
    }
    catch (error) {
      if (error instanceof NotFoundError) {
        return failure(error)
      }
      throw error
    }
  }
}
