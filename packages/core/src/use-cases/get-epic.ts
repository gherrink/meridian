import type { Epic } from '../model/epic.js'
import type { EpicId } from '../model/value-objects.js'
import type { IEpicRepository } from '../ports/epic-repository.js'
import type { Result } from './result.js'

import { NotFoundError } from '../errors/domain-errors.js'
import { failure, success } from './result.js'

export class GetEpicUseCase {
  private readonly epicRepository: IEpicRepository

  constructor(epicRepository: IEpicRepository) {
    this.epicRepository = epicRepository
  }

  async execute(id: EpicId): Promise<Result<Epic, NotFoundError>> {
    try {
      const epic = await this.epicRepository.getById(id)
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
