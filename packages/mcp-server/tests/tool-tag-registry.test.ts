import { describe, expect, it } from 'vitest'

import { ToolTagRegistry } from '../src/helpers/tool-tag-registry.js'

describe('toolTagRegistry', () => {
  it('tC-37: register stores tags for tool', () => {
    const registry = new ToolTagRegistry()

    registry.register('t', new Set(['pm']))

    const tags = registry.getTagsForTool('t')
    expect(tags.has('pm')).toBe(true)
    expect(tags.size).toBe(1)
  })

  it('tC-38: getTagsForTool returns empty set for unknown tool', () => {
    const registry = new ToolTagRegistry()

    const tags = registry.getTagsForTool('unknown')

    expect(tags.size).toBe(0)
  })

  it('tC-39: register overwrites previous tags', () => {
    const registry = new ToolTagRegistry()

    registry.register('t', new Set(['pm']))
    registry.register('t', new Set(['dev']))

    const tags = registry.getTagsForTool('t')
    expect(tags.has('dev')).toBe(true)
    expect(tags.has('pm')).toBe(false)
    expect(tags.size).toBe(1)
  })

  it('tC-40: getAll returns all registered entries', () => {
    const registry = new ToolTagRegistry()

    registry.register('a', new Set(['pm']))
    registry.register('b', new Set(['dev']))

    const all = registry.getAll()
    expect(all.size).toBe(2)
    expect(all.has('a')).toBe(true)
    expect(all.has('b')).toBe(true)
  })

  it('tC-41: returned tags are ReadonlySet', () => {
    const registry = new ToolTagRegistry()

    registry.register('t', new Set(['x']))

    const tags = registry.getTagsForTool('t')
    expect(typeof tags.has).toBe('function')
    expect(tags.has('x')).toBe(true)
    // ReadonlySet should not expose 'add' at the type level,
    // but at runtime it may still be a Set. We verify it has 'has'.
    expect(tags).toBeInstanceOf(Set)
  })
})
