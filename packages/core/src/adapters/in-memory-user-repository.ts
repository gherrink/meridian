import type { PaginatedResult, PaginationParams } from '../model/pagination.js'
import type { User } from '../model/user.js'
import type { UserId } from '../model/value-objects.js'
import type { IUserRepository } from '../ports/user-repository.js'

import { AuthorizationError, NotFoundError } from '../errors/domain-errors.js'
import { paginate } from './paginate.js'

export class InMemoryUserRepository implements IUserRepository {
  private readonly store = new Map<UserId, User>()
  private currentUser: User | undefined

  constructor(currentUser?: User) {
    if (currentUser) {
      this.currentUser = currentUser
      this.store.set(currentUser.id, currentUser)
    }
  }

  getById = async (id: UserId): Promise<User> => {
    const user = this.store.get(id)
    if (!user) {
      throw new NotFoundError('User', id)
    }
    return user
  }

  getCurrent = async (): Promise<User> => {
    if (!this.currentUser) {
      throw new AuthorizationError('getCurrent', 'No authenticated user configured')
    }
    return this.currentUser
  }

  search = async (query: string, pagination: PaginationParams): Promise<PaginatedResult<User>> => {
    const lowerQuery = query.toLowerCase()
    const matchingUsers = Array.from(this.store.values()).filter((user) => {
      const nameMatch = user.name.toLowerCase().includes(lowerQuery)
      const emailMatch = user.email?.toLowerCase().includes(lowerQuery) ?? false
      return nameMatch || emailMatch
    })
    return paginate(matchingUsers, pagination, undefined, 'name')
  }

  seed(users: User[]): void {
    for (const user of users) {
      this.store.set(user.id, user)
    }
  }

  setCurrentUser(user: User): void {
    this.currentUser = user
    this.store.set(user.id, user)
  }

  reset(): void {
    this.store.clear()
    this.currentUser = undefined
  }
}
