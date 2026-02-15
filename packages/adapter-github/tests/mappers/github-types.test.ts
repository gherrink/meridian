import { describe, expect, it } from 'vitest'

import { normalizeLabels } from '../../src/mappers/github-types.js'

describe('githubTypes', () => {
  describe('normalizeLabels', () => {
    it('gT-01: converts string labels to objects', () => {
      const result = normalizeLabels(['bug', 'feature'])

      expect(result).toEqual([{ name: 'bug' }, { name: 'feature' }])
    })

    it('gT-02: passes through object labels', () => {
      const labels = [{ id: 1, name: 'bug', color: 'fc2929' }]

      const result = normalizeLabels(labels)

      expect(result).toEqual([{ id: 1, name: 'bug', color: 'fc2929' }])
    })

    it('gT-03: handles mixed array', () => {
      const result = normalizeLabels(['bug', { name: 'feature' }])

      expect(result).toEqual([{ name: 'bug' }, { name: 'feature' }])
    })

    it('gT-04: handles empty array', () => {
      const result = normalizeLabels([])

      expect(result).toEqual([])
    })
  })
})
