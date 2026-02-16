export interface FilterConfig {
  includeTags?: ReadonlySet<string>
  excludeTags?: ReadonlySet<string>
}

/**
 * Determines which tools are visible given tag-based filter configuration.
 *
 * Algorithm:
 * 1. No filters -> return all tools.
 * 2. Start with all tools.
 * 3. If excludeTags is set, remove tools where ALL of their tags are in excludeTags.
 *    Untagged tools (empty tag set) are never removed by exclude.
 * 4. If includeTags is set, keep only tools that have at least one tag in includeTags
 *    OR have the "shared" tag — unless "shared" was already excluded in step 3.
 *    Untagged tools are removed if includeTags is set (they match nothing).
 *
 * Exclude always wins: a tool removed by exclude stays removed regardless of include.
 */
export function resolveVisibleTools(
  toolNames: readonly string[],
  tagMap: ReadonlyMap<string, ReadonlySet<string>>,
  config: FilterConfig,
): Set<string> {
  const hasExclude = config.excludeTags !== undefined && config.excludeTags.size > 0
  const hasInclude = config.includeTags !== undefined && config.includeTags.size > 0

  if (!hasExclude && !hasInclude) {
    return new Set(toolNames)
  }

  let visibleNames = new Set(toolNames)

  if (hasExclude) {
    visibleNames = applyExcludeFilter(visibleNames, tagMap, config.excludeTags!)
  }

  if (hasInclude) {
    const sharedWasExcluded = hasExclude && config.excludeTags!.has('shared')
    visibleNames = applyIncludeFilter(visibleNames, tagMap, config.includeTags!, sharedWasExcluded)
  }

  return visibleNames
}

function applyExcludeFilter(
  visibleNames: Set<string>,
  tagMap: ReadonlyMap<string, ReadonlySet<string>>,
  excludeTags: ReadonlySet<string>,
): Set<string> {
  const result = new Set<string>()

  for (const name of visibleNames) {
    const toolTags = tagMap.get(name)

    if (toolTags === undefined || toolTags.size === 0) {
      result.add(name)
      continue
    }

    const allTagsExcluded = everyTagIsIn(toolTags, excludeTags)

    if (!allTagsExcluded) {
      result.add(name)
    }
  }

  return result
}

function applyIncludeFilter(
  visibleNames: Set<string>,
  tagMap: ReadonlyMap<string, ReadonlySet<string>>,
  includeTags: ReadonlySet<string>,
  sharedWasExcluded: boolean,
): Set<string> {
  const result = new Set<string>()

  for (const name of visibleNames) {
    const toolTags = tagMap.get(name)

    if (toolTags === undefined || toolTags.size === 0) {
      continue
    }

    if (hasAnyTagIn(toolTags, includeTags)) {
      result.add(name)
      continue
    }

    if (!sharedWasExcluded && toolTags.has('shared')) {
      result.add(name)
    }
  }

  return result
}

function everyTagIsIn(tags: ReadonlySet<string>, targetSet: ReadonlySet<string>): boolean {
  for (const tag of tags) {
    if (!targetSet.has(tag)) {
      return false
    }
  }
  return true
}

function hasAnyTagIn(tags: ReadonlySet<string>, targetSet: ReadonlySet<string>): boolean {
  for (const tag of tags) {
    if (targetSet.has(tag)) {
      return true
    }
  }
  return false
}
