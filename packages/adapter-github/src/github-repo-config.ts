import type { ProjectId } from '@meridian/core'

export interface GitHubRepoConfig {
  owner: string
  repo: string
  projectId: ProjectId
}
