import { describe, expect, it } from 'vitest'

import { extractPriority, extractStatus, extractTags, toPriorityLabel, toStatusLabels } from '../../src/mappers/label-mapper.js'

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

  describe('extractStatus', () => {
    it('lM-06: closed state returns closed', () => {
      const result = extractStatus('closed', [])

      expect(result).toBe('closed')
    })

    it('lM-07: closed state ignores in-progress label', () => {
      const labels = [{ name: 'status:in-progress' }]

      const result = extractStatus('closed', labels)

      expect(result).toBe('closed')
    })

    it('lM-08: open with in-progress label', () => {
      const labels = [{ name: 'status:in-progress' }]

      const result = extractStatus('open', labels)

      expect(result).toBe('in_progress')
    })

    it('lM-09: open with in_progress variant', () => {
      const labels = [{ name: 'status:in_progress' }]

      const result = extractStatus('open', labels)

      expect(result).toBe('in_progress')
    })

    it('lM-10: open without status label', () => {
      const labels = [{ name: 'bug' }]

      const result = extractStatus('open', labels)

      expect(result).toBe('open')
    })
  })

  describe('extractTags', () => {
    it('lM-11: filters out priority/status labels', () => {
      const labels = [
        { id: 1, name: 'bug' },
        { id: 2, name: 'priority:high' },
        { id: 3, name: 'status:in-progress' },
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

  describe('toStatusLabels', () => {
    it('lM-18: in_progress', () => {
      const result = toStatusLabels('in_progress')

      expect(result).toEqual(['status:in-progress'])
    })

    it('lM-19: open returns empty', () => {
      expect(toStatusLabels('open')).toEqual([])
    })

    it('lM-20: closed returns empty', () => {
      expect(toStatusLabels('closed')).toEqual([])
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
