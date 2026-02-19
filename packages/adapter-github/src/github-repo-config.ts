import type { MilestoneId } from '@meridian/core'

export interface GitHubRepoConfig {
  owner: string
  repo: string
  milestoneId?: MilestoneId
}
