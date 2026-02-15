import { describe, expect, it } from 'vitest'

import {
  COMMENT_ID_NAMESPACE,
  generateDeterministicId,
  ISSUE_ID_NAMESPACE,
  PROJECT_ID_NAMESPACE,
  USER_ID_NAMESPACE,
} from '../../src/mappers/deterministic-id.js'

const UUID_V5_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('deterministicId', () => {
  it('dI-01: produces valid UUID v5 format', () => {
    const result = generateDeterministicId(ISSUE_ID_NAMESPACE, 'test-owner/test-repo#42')

    expect(result).toMatch(UUID_V5_REGEX)
  })

  it('dI-02: deterministic for same input', () => {
    const first = generateDeterministicId(ISSUE_ID_NAMESPACE, 'test-owner/test-repo#42')
    const second = generateDeterministicId(ISSUE_ID_NAMESPACE, 'test-owner/test-repo#42')

    expect(first).toBe(second)
  })

  it('dI-03: different output for different input', () => {
    const resultA = generateDeterministicId(ISSUE_ID_NAMESPACE, 'a')
    const resultB = generateDeterministicId(ISSUE_ID_NAMESPACE, 'b')

    expect(resultA).not.toBe(resultB)
  })

  it('dI-04: different output for different namespace', () => {
    const resultIssue = generateDeterministicId(ISSUE_ID_NAMESPACE, 'same-input')
    const resultComment = generateDeterministicId(COMMENT_ID_NAMESPACE, 'same-input')

    expect(resultIssue).not.toBe(resultComment)
  })

  it('dI-05: four namespaces are distinct', () => {
    const namespaces = [ISSUE_ID_NAMESPACE, COMMENT_ID_NAMESPACE, USER_ID_NAMESPACE, PROJECT_ID_NAMESPACE]
    const uniqueNamespaces = new Set(namespaces)

    expect(uniqueNamespaces.size).toBe(4)
  })

  describe('edge cases', () => {
    it('eC-04: same input across namespaces yields different ids', () => {
      const resultIssue = generateDeterministicId(ISSUE_ID_NAMESPACE, 'x')
      const resultUser = generateDeterministicId(USER_ID_NAMESPACE, 'x')

      expect(resultIssue).not.toBe(resultUser)
    })
  })
})
