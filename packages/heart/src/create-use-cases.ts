import type { IAuditLogger } from '@meridian/core'

import type { AdapterSet } from './create-adapters.js'

import {
  AssignIssueUseCase,
  CreateIssueUseCase,
  CreateProjectUseCase,
  GetProjectOverviewUseCase,
  ListIssuesUseCase,
  UpdateIssueUseCase,
  UpdateStatusUseCase,
} from '@meridian/core'

export interface UseCaseSet {
  createIssue: CreateIssueUseCase
  createProject: CreateProjectUseCase
  listIssues: ListIssuesUseCase
  assignIssue: AssignIssueUseCase
  updateStatus: UpdateStatusUseCase
  updateIssue: UpdateIssueUseCase
  getProjectOverview: GetProjectOverviewUseCase
}

export function createUseCases(adapters: AdapterSet, auditLogger: IAuditLogger): UseCaseSet {
  return {
    createIssue: new CreateIssueUseCase(adapters.issueRepository, auditLogger),
    createProject: new CreateProjectUseCase(adapters.projectRepository, auditLogger),
    listIssues: new ListIssuesUseCase(adapters.issueRepository),
    assignIssue: new AssignIssueUseCase(adapters.issueRepository, adapters.userRepository, auditLogger),
    updateStatus: new UpdateStatusUseCase(adapters.issueRepository, auditLogger),
    updateIssue: new UpdateIssueUseCase(adapters.issueRepository, auditLogger),
    getProjectOverview: new GetProjectOverviewUseCase(adapters.projectRepository, adapters.issueRepository),
  }
}
