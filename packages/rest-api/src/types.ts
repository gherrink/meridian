import type {
  AssignIssueUseCase,
  CreateIssueUseCase,
  GetProjectOverviewUseCase,
  IAuditLogger,
  ListIssuesUseCase,
  UpdateIssueUseCase,
  UpdateStatusUseCase,
} from '@meridian/core'

export interface RestApiConfig {
  corsOrigins?: string[]
  apiVersion?: string
}

export interface RestApiDependencies {
  auditLogger: IAuditLogger
  createIssue: CreateIssueUseCase
  listIssues: ListIssuesUseCase
  updateIssue: UpdateIssueUseCase
  updateStatus: UpdateStatusUseCase
  assignIssue: AssignIssueUseCase
  getProjectOverview: GetProjectOverviewUseCase
  config?: RestApiConfig
}
