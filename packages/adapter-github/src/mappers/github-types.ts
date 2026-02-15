export interface GitHubLabel {
  id?: number
  name?: string
  color?: string | null
}

export interface GitHubUser {
  login?: string
  id?: number
}

export function normalizeLabels(labels: Array<GitHubLabel | string>): GitHubLabel[] {
  return labels.map((label) => {
    if (typeof label === 'string') {
      return { name: label }
    }
    return label
  })
}
