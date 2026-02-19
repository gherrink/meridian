import type { IAuditLogger } from '@meridian/core'

import type { AdapterSet } from './create-adapters.js'

import {
  AssignIssueUseCase,
  CreateIssueUseCase,
  CreateMilestoneUseCase,
  GetMilestoneOverviewUseCase,
  ListIssuesUseCase,
  UpdateIssueUseCase,
  UpdateStateUseCase,
} from '@meridian/core'

export interface UseCaseSet {
  createIssue: CreateIssueUseCase
  createMilestone: CreateMilestoneUseCase
  listIssues: ListIssuesUseCase
  assignIssue: AssignIssueUseCase
  updateState: UpdateStateUseCase
  updateIssue: UpdateIssueUseCase
  getMilestoneOverview: GetMilestoneOverviewUseCase
}

export function createUseCases(adapters: AdapterSet, auditLogger: IAuditLogger): UseCaseSet {
  return {
    createIssue: new CreateIssueUseCase(adapters.issueRepository, auditLogger),
    createMilestone: new CreateMilestoneUseCase(adapters.milestoneRepository, auditLogger),
    listIssues: new ListIssuesUseCase(adapters.issueRepository),
    assignIssue: new AssignIssueUseCase(adapters.issueRepository, adapters.userRepository, auditLogger),
    updateState: new UpdateStateUseCase(adapters.issueRepository, auditLogger),
    updateIssue: new UpdateIssueUseCase(adapters.issueRepository, auditLogger),
    getMilestoneOverview: new GetMilestoneOverviewUseCase(adapters.milestoneRepository, adapters.issueRepository),
  }
}
