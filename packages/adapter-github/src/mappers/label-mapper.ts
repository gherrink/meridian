import type { Priority, State, Tag, TagId } from '@meridian/core'

import type { GitHubLabel } from './github-types.js'

const PRIORITY_PREFIX = 'priority:'
const STATE_PREFIX = 'state:'
const STATUS_PREFIX = 'status:'

const PRIORITY_LABEL_MAP: Record<string, Priority> = {
  'priority:low': 'low',
  'priority:normal': 'normal',
  'priority:high': 'high',
  'priority:urgent': 'urgent',
}

const VALID_PRIORITIES = new Set(Object.keys(PRIORITY_LABEL_MAP))

export function extractPriority(labels: GitHubLabel[]): Priority {
  for (const label of labels) {
    const name = label.name?.toLowerCase()
    if (name !== undefined && VALID_PRIORITIES.has(name)) {
      return PRIORITY_LABEL_MAP[name]!
    }
  }
  return 'normal'
}

export function extractState(githubState: string, labels: GitHubLabel[]): State {
  if (githubState === 'closed') {
    return 'done'
  }

  for (const label of labels) {
    const name = label.name?.toLowerCase()
    if (name === 'state:in-progress' || name === 'state:in_progress') {
      return 'in_progress'
    }
  }

  return 'open'
}

export function extractStatus(labels: GitHubLabel[]): string {
  for (const label of labels) {
    const name = label.name?.toLowerCase()
    if (name !== undefined && name.startsWith(STATUS_PREFIX)) {
      return name.slice(STATUS_PREFIX.length)
    }
  }
  return 'backlog'
}

export function extractTags(labels: GitHubLabel[]): Tag[] {
  return labels
    .filter((label) => {
      const name = label.name?.toLowerCase() ?? ''
      return !name.startsWith(PRIORITY_PREFIX)
        && !name.startsWith(STATE_PREFIX)
        && !name.startsWith(STATUS_PREFIX)
    })
    .map(label => ({
      id: generateDeterministicTagId(label.id ?? 0) as TagId,
      name: label.name ?? '',
      color: normalizeColor(label.color ?? null),
    }))
}

export function toPriorityLabel(priority: Priority): string {
  return `${PRIORITY_PREFIX}${priority}`
}

export function toStateLabels(state: State): string[] {
  if (state === 'in_progress') {
    return ['state:in-progress']
  }
  return []
}

export function toStatusLabels(status: string): string[] {
  if (status && status !== 'backlog') {
    return [`${STATUS_PREFIX}${status}`]
  }
  return []
}

function generateDeterministicTagId(labelId: number): string {
  const hex = labelId.toString(16).padStart(12, '0')
  return `00000000-0000-5000-a000-${hex}`
}

function normalizeColor(color: string | null): string | null {
  if (color === null || color === undefined) {
    return null
  }
  const cleaned = color.startsWith('#') ? color : `#${color}`
  return /^#[\da-f]{6}$/i.test(cleaned) ? cleaned.toLowerCase() : null
}
