import type { LinkPersistenceStrategy } from '../../src/strategies/link-persistence-strategy.js'

import { describe, expect, it, vi } from 'vitest'

import { StrategyRouter } from '../../src/strategies/strategy-router.js'

function createMockStrategy(): LinkPersistenceStrategy {
  return {
    createLink: vi.fn(),
    deleteLink: vi.fn(),
    findLinksByIssue: vi.fn(),
  }
}

describe('strategyRouter', () => {
  describe('resolveStrategy', () => {
    it('sR-01: returns dependency strategy for blocks', () => {
      const dep = createMockStrategy()
      const sub = createMockStrategy()
      const router = new StrategyRouter(dep, sub, new Map())

      const result = router.resolveStrategy('blocks')

      expect(result).toBe(dep)
    })

    it('sR-02: returns dependency strategy for blocked_by', () => {
      const dep = createMockStrategy()
      const sub = createMockStrategy()
      const router = new StrategyRouter(dep, sub, new Map())

      const result = router.resolveStrategy('blocked_by')

      expect(result).toBe(dep)
    })

    it('sR-03: returns sub-issue strategy for parent', () => {
      const dep = createMockStrategy()
      const sub = createMockStrategy()
      const router = new StrategyRouter(dep, sub, new Map())

      const result = router.resolveStrategy('parent')

      expect(result).toBe(sub)
    })

    it('sR-04: returns comment strategy for duplicates', () => {
      const dep = createMockStrategy()
      const sub = createMockStrategy()
      const duplicatesStrategy = createMockStrategy()
      const commentStrategies = new Map<string, LinkPersistenceStrategy>([
        ['duplicates', duplicatesStrategy],
      ])
      const router = new StrategyRouter(dep, sub, commentStrategies)

      const result = router.resolveStrategy('duplicates')

      expect(result).toBe(duplicatesStrategy)
    })

    it('sR-05: throws for unregistered type', () => {
      const dep = createMockStrategy()
      const sub = createMockStrategy()
      const router = new StrategyRouter(dep, sub, new Map())

      expect(() => router.resolveStrategy('unknown')).toThrow(/unknown/)
    })
  })

  describe('allStrategies', () => {
    it('sR-06: returns unique strategies', () => {
      const dep = createMockStrategy()
      const sub = createMockStrategy()
      const dup = createMockStrategy()
      const rel = createMockStrategy()
      const commentStrategies = new Map<string, LinkPersistenceStrategy>([
        ['duplicates', dup],
        ['relates-to', rel],
      ])
      const router = new StrategyRouter(dep, sub, commentStrategies)

      const result = router.allStrategies()

      expect(result).toHaveLength(4)
    })

    it('sR-07: deduplicates if same strategy registered twice', () => {
      const dep = createMockStrategy()
      const sub = createMockStrategy()
      const shared = createMockStrategy()
      const commentStrategies = new Map<string, LinkPersistenceStrategy>([
        ['duplicates', shared],
        ['relates-to', shared],
      ])
      const router = new StrategyRouter(dep, sub, commentStrategies)

      const result = router.allStrategies()

      // dep + sub + 1 unique comment = 3
      expect(result).toHaveLength(3)
    })
  })

  describe('edge cases', () => {
    it('eC-09: empty commentStrategies map is valid', () => {
      const dep = createMockStrategy()
      const sub = createMockStrategy()
      const router = new StrategyRouter(dep, sub, new Map())

      const result = router.allStrategies()

      expect(result).toHaveLength(2)
    })
  })
})
