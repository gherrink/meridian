import type { LinkPersistenceStrategy } from './link-persistence-strategy.js'

const DEPENDENCY_API_TYPES = new Set(['blocks', 'blocked_by'])
const SUB_ISSUE_API_TYPE = 'parent'

export class StrategyRouter {
  private readonly dependencyStrategy: LinkPersistenceStrategy
  private readonly subIssueStrategy: LinkPersistenceStrategy
  private readonly commentStrategies: Map<string, LinkPersistenceStrategy>

  constructor(
    dependencyStrategy: LinkPersistenceStrategy,
    subIssueStrategy: LinkPersistenceStrategy,
    commentStrategies: Map<string, LinkPersistenceStrategy>,
  ) {
    this.dependencyStrategy = dependencyStrategy
    this.subIssueStrategy = subIssueStrategy
    this.commentStrategies = commentStrategies
  }

  resolveStrategy(linkType: string): LinkPersistenceStrategy {
    if (DEPENDENCY_API_TYPES.has(linkType)) {
      return this.dependencyStrategy
    }
    if (linkType === SUB_ISSUE_API_TYPE) {
      return this.subIssueStrategy
    }

    const commentStrategy = this.commentStrategies.get(linkType)
    if (commentStrategy !== undefined) {
      return commentStrategy
    }

    throw new Error(`No persistence strategy registered for link type '${linkType}'`)
  }

  nativeStrategies(): LinkPersistenceStrategy[] {
    return [this.dependencyStrategy, this.subIssueStrategy]
  }

  allStrategies(): LinkPersistenceStrategy[] {
    const uniqueStrategies = new Set<LinkPersistenceStrategy>([
      this.dependencyStrategy,
      this.subIssueStrategy,
      ...this.commentStrategies.values(),
    ])
    return [...uniqueStrategies]
  }
}
