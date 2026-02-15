import type { Priority, Status, Tag, TagId } from '@meridian/core'

import type { GitHubLabel } from './github-types.js'

const PRIORITY_PREFIX = 'priority:'
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

export function extractStatus(githubState: string, labels: GitHubLabel[]): Status {
  if (githubState === 'closed') {
    return 'closed'
  }

  for (const label of labels) {
    const name = label.name?.toLowerCase()
    if (name === 'status:in-progress' || name === 'status:in_progress') {
      return 'in_progress'
    }
  }

  return 'open'
}

export function extractTags(labels: GitHubLabel[]): Tag[] {
  return labels
    .filter((label) => {
      const name = label.name?.toLowerCase() ?? ''
      return !name.startsWith(PRIORITY_PREFIX) && !name.startsWith(STATUS_PREFIX)
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

export function toStatusLabels(status: Status): string[] {
  if (status === 'in_progress') {
    return ['status:in-progress']
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
