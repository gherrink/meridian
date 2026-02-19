import { describe, expect, it } from 'vitest'

import { extractPriority, extractState, extractStatus, extractTags, toPriorityLabel, toStateLabels, toStatusLabels } from '../../src/mappers/label-mapper.js'

describe('labelMapper', () => {
  describe('extractPriority', () => {
    it('lM-01: returns priority from label', () => {
      const labels = [{ name: 'priority:high' }]

      const result = extractPriority(labels)

      expect(result).toBe('high')
    })

    it('lM-02: returns normal when no priority label', () => {
      const labels = [{ name: 'bug' }]

      const result = extractPriority(labels)

      expect(result).toBe('normal')
    })

    it('lM-03: returns normal for empty labels', () => {
      const result = extractPriority([])

      expect(result).toBe('normal')
    })

    it('lM-04: case-insensitive match', () => {
      const labels = [{ name: 'Priority:Urgent' }]

      const result = extractPriority(labels)

      expect(result).toBe('urgent')
    })

    it('lM-05: picks first matching priority', () => {
      const labels = [
        { name: 'priority:low' },
        { name: 'priority:high' },
      ]

      const result = extractPriority(labels)

      expect(result).toBe('low')
    })
  })

  describe('extractState', () => {
    it('lM-06: closed github state returns done', () => {
      const result = extractState('closed', [])

      expect(result).toBe('done')
    })

    it('lM-07: closed github state ignores in-progress label', () => {
      const labels = [{ name: 'state:in-progress' }]

      const result = extractState('closed', labels)

      expect(result).toBe('done')
    })

    it('lM-08: open with state:in-progress label', () => {
      const labels = [{ name: 'state:in-progress' }]

      const result = extractState('open', labels)

      expect(result).toBe('in_progress')
    })

    it('lM-09: open with state:in_progress variant', () => {
      const labels = [{ name: 'state:in_progress' }]

      const result = extractState('open', labels)

      expect(result).toBe('in_progress')
    })

    it('lM-10: open without state label', () => {
      const labels = [{ name: 'bug' }]

      const result = extractState('open', labels)

      expect(result).toBe('open')
    })
  })

  describe('extractStatus', () => {
    it('lM-26: returns status from label', () => {
      const labels = [{ name: 'status:in-review' }]

      const result = extractStatus(labels)

      expect(result).toBe('in-review')
    })

    it('lM-27: returns backlog when no status label', () => {
      const labels = [{ name: 'bug' }]

      const result = extractStatus(labels)

      expect(result).toBe('backlog')
    })

    it('lM-28: returns backlog for empty labels', () => {
      const result = extractStatus([])

      expect(result).toBe('backlog')
    })
  })

  describe('extractTags', () => {
    it('lM-11: filters out priority/state/status labels', () => {
      const labels = [
        { id: 1, name: 'bug' },
        { id: 2, name: 'priority:high' },
        { id: 3, name: 'state:in-progress' },
        { id: 4, name: 'status:in-review' },
      ]

      const result = extractTags(labels)

      expect(result).toHaveLength(1)
      expect(result[0]!.name).toBe('bug')
    })

    it('lM-12: normalizes color with hash', () => {
      const labels = [{ id: 1, name: 'x', color: 'fc2929' }]

      const result = extractTags(labels)

      expect(result[0]!.color).toBe('#fc2929')
    })

    it('lM-13: preserves hash prefix', () => {
      const labels = [{ id: 1, name: 'x', color: '#FC2929' }]

      const result = extractTags(labels)

      expect(result[0]!.color).toBe('#fc2929')
    })

    it('lM-14: null color stays null', () => {
      const labels = [{ id: 1, name: 'x', color: null }]

      const result = extractTags(labels)

      expect(result[0]!.color).toBeNull()
    })

    it('lM-15: invalid color returns null', () => {
      const labels = [{ id: 1, name: 'x', color: 'xyz' }]

      const result = extractTags(labels)

      expect(result[0]!.color).toBeNull()
    })

    it('lM-16: deterministic tag id from label id', () => {
      const labels = [{ id: 42, name: 'bug' }]

      const firstResult = extractTags(labels)
      const secondResult = extractTags(labels)

      expect(firstResult[0]!.id).toBe(secondResult[0]!.id)
    })
  })

  describe('toPriorityLabel', () => {
    it('lM-17: formats correctly', () => {
      expect(toPriorityLabel('high')).toBe('priority:high')
    })
  })

  describe('toStateLabels', () => {
    it('lM-18: in_progress produces state:in-progress label', () => {
      const result = toStateLabels('in_progress')

      expect(result).toEqual(['state:in-progress'])
    })

    it('lM-19: open returns empty', () => {
      expect(toStateLabels('open')).toEqual([])
    })

    it('lM-20: done returns empty', () => {
      expect(toStateLabels('done')).toEqual([])
    })
  })

  describe('toStatusLabels', () => {
    it('lM-21: non-backlog status produces status label', () => {
      const result = toStatusLabels('in-review')

      expect(result).toEqual(['status:in-review'])
    })

    it('lM-22: backlog returns empty', () => {
      expect(toStatusLabels('backlog')).toEqual([])
    })

    it('lM-23: empty string returns empty', () => {
      expect(toStatusLabels('')).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('eC-01: extractTags with label.name undefined', () => {
      const labels = [{ id: 1 }] as Array<{ id: number, name?: string }>

      const result = extractTags(labels as Array<{ id: number, name: string }>)

      expect(result[0]!.name).toBe('')
    })

    it('eC-02: normalizeColor with empty string', () => {
      const labels = [{ id: 1, name: 'x', color: '' }]

      const result = extractTags(labels)

      expect(result[0]!.color).toBeNull()
    })
  })
})
