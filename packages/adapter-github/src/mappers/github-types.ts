export interface GitHubLabel {
  id?: number
  name?: string
  color?: string | null
}

export interface GitHubUser {
  login?: string
  id?: number
}

export interface GitHubUserResponse {
  login: string
  id: number
  avatar_url: string
  html_url: string
  type: string
  site_admin: boolean
}

export interface GitHubCommentResponse {
  id: number
  body: string
  user: GitHubUserResponse | null
  created_at: string
  updated_at: string
  html_url: string
  reactions?: { total_count?: number } | null
}

export interface GitHubMilestoneResponse {
  id: number
  number: number
  title: string
  description: string | null
  state: string
  created_at: string
  updated_at: string
  html_url: string
  open_issues: number
  closed_issues: number
}

export function normalizeLabels(labels: Array<GitHubLabel | string>): GitHubLabel[] {
  return labels.map((label) => {
    if (typeof label === 'string') {
      return { name: label }
    }
    return label
  })
}
