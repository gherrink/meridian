import { describe, expect, it } from 'vitest'

import { resolveVisibleTools } from '../src/helpers/resolve-visible-tools.js'

type TagMap = ReadonlyMap<string, ReadonlySet<string>>

function buildTagMap(entries: Array<[string, string[]]>): TagMap {
  return new Map(entries.map(([name, tags]) => [name, new Set(tags)]))
}

// Standard 6-tool tag map from shared patterns
const standardToolNames = ['tool_pm', 'tool_dev', 'tool_shared', 'tool_pm_shared', 'tool_dev_pm', 'tool_untagged']
const standardTagMap = buildTagMap([
  ['tool_pm', ['pm']],
  ['tool_dev', ['dev']],
  ['tool_shared', ['shared']],
  ['tool_pm_shared', ['pm', 'shared']],
  ['tool_dev_pm', ['dev', 'pm']],
  ['tool_untagged', []],
])

describe('resolveVisibleTools', () => {
  it('tC-42: no filters returns all tools', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {})

    expect(result.size).toBe(6)
    for (const name of standardToolNames) {
      expect(result.has(name)).toBe(true)
    }
  })

  it('tC-43: empty include and exclude sets returns all', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {
      includeTags: new Set(),
      excludeTags: new Set(),
    })

    expect(result.size).toBe(6)
    for (const name of standardToolNames) {
      expect(result.has(name)).toBe(true)
    }
  })

  it('tC-44: includeTags=pm returns pm-tagged and shared-tagged tools', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {
      includeTags: new Set(['pm']),
    })

    expect(result.has('tool_pm')).toBe(true)
    expect(result.has('tool_shared')).toBe(true)
    expect(result.has('tool_pm_shared')).toBe(true)
    expect(result.has('tool_dev_pm')).toBe(true)
    expect(result.has('tool_dev')).toBe(false)
    expect(result.has('tool_untagged')).toBe(false)
  })

  it('tC-45: includeTags=dev returns dev-tagged and shared-tagged tools', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {
      includeTags: new Set(['dev']),
    })

    expect(result.has('tool_dev')).toBe(true)
    expect(result.has('tool_shared')).toBe(true)
    expect(result.has('tool_dev_pm')).toBe(true)
    expect(result.has('tool_pm')).toBe(false)
    expect(result.has('tool_untagged')).toBe(false)
  })

  it('tC-46: excludeTags=dev removes tools with only dev tag', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {
      excludeTags: new Set(['dev']),
    })

    expect(result.has('tool_dev')).toBe(false)
    expect(result.has('tool_dev_pm')).toBe(true)
    expect(result.has('tool_pm')).toBe(true)
    expect(result.has('tool_shared')).toBe(true)
    expect(result.has('tool_pm_shared')).toBe(true)
    expect(result.has('tool_untagged')).toBe(true)
  })

  it('tC-47: excludeTags=pm removes tools with only pm tag', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {
      excludeTags: new Set(['pm']),
    })

    expect(result.has('tool_pm')).toBe(false)
    expect(result.has('tool_pm_shared')).toBe(true)
    expect(result.has('tool_dev_pm')).toBe(true)
    expect(result.has('tool_dev')).toBe(true)
    expect(result.has('tool_shared')).toBe(true)
    expect(result.has('tool_untagged')).toBe(true)
  })

  it('tC-48: exclude takes precedence over include', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {
      includeTags: new Set(['dev']),
      excludeTags: new Set(['dev']),
    })

    expect(result.has('tool_dev')).toBe(false)
    expect(result.has('tool_dev_pm')).toBe(true)
    expect(result.has('tool_shared')).toBe(true)
  })

  it('tC-49: shared tag auto-included even if not in includeTags', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {
      includeTags: new Set(['pm']),
    })

    expect(result.has('tool_shared')).toBe(true)
  })

  it('tC-50: shared tag can be explicitly excluded', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {
      excludeTags: new Set(['shared']),
    })

    // tool_shared has tags {shared} -- ALL tags in exclude, so removed
    expect(result.has('tool_shared')).toBe(false)
    // tool_pm_shared has tags {pm, shared} -- not ALL tags in exclude, so stays
    expect(result.has('tool_pm_shared')).toBe(true)
  })

  it('tC-51: includeTags=pm with excludeTags=shared', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {
      includeTags: new Set(['pm']),
      excludeTags: new Set(['shared']),
    })

    // tool_shared removed by exclude (all tags in exclude)
    expect(result.has('tool_shared')).toBe(false)
    // tool_pm_shared survives exclude (has pm); include keeps pm-tagged
    expect(result.has('tool_pm_shared')).toBe(true)
    expect(result.has('tool_pm')).toBe(true)
    expect(result.has('tool_dev_pm')).toBe(true)
  })

  it('tC-52: untagged tools pass through exclude filter', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {
      excludeTags: new Set(['dev']),
    })

    expect(result.has('tool_untagged')).toBe(true)
  })

  it('tC-53: untagged tools removed by include filter', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {
      includeTags: new Set(['pm']),
    })

    expect(result.has('tool_untagged')).toBe(false)
  })

  it('tC-54: all tools excluded yields empty set', () => {
    const tagMap = buildTagMap([['only_tool', ['dev']]])
    const result = resolveVisibleTools(['only_tool'], tagMap, {
      excludeTags: new Set(['dev']),
    })

    expect(result.size).toBe(0)
  })

  it('tC-55: include with no matching tags yields empty set', () => {
    const tagMap = buildTagMap([['only_tool', ['dev']]])
    const result = resolveVisibleTools(['only_tool'], tagMap, {
      includeTags: new Set(['pm']),
    })

    expect(result.size).toBe(0)
  })

  it('tC-56: tool with multiple tags survives partial exclude', () => {
    const tagMap = buildTagMap([['tool_dev_pm', ['dev', 'pm']]])
    const result = resolveVisibleTools(['tool_dev_pm'], tagMap, {
      excludeTags: new Set(['dev']),
    })

    expect(result.has('tool_dev_pm')).toBe(true)
  })

  it('tC-57: returns Set type', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {})

    expect(result).toBeInstanceOf(Set)
  })

  // Edge cases
  it('tC-65: empty tool list with filters', () => {
    const result = resolveVisibleTools([], new Map(), {
      includeTags: new Set(['pm']),
    })

    expect(result.size).toBe(0)
  })

  it('tC-66: tool in toolNames but missing from tagMap', () => {
    const result = resolveVisibleTools(['ghost'], new Map(), {
      excludeTags: new Set(['dev']),
    })

    expect(result.has('ghost')).toBe(true)
  })

  it('tC-67: tool in toolNames but missing from tagMap with include filter', () => {
    const result = resolveVisibleTools(['ghost'], new Map(), {
      includeTags: new Set(['pm']),
    })

    expect(result.has('ghost')).toBe(false)
  })

  it('tC-68: single tool with all tags matching exclude', () => {
    const tagMap = buildTagMap([['t', ['a', 'b']]])
    const result = resolveVisibleTools(['t'], tagMap, {
      excludeTags: new Set(['a', 'b']),
    })

    expect(result.size).toBe(0)
  })

  it('tC-69: FilterConfig with undefined includeTags and excludeTags', () => {
    const result = resolveVisibleTools(standardToolNames, standardTagMap, {
      includeTags: undefined,
      excludeTags: undefined,
    })

    expect(result.size).toBe(6)
    for (const name of standardToolNames) {
      expect(result.has(name)).toBe(true)
    }
  })
})
