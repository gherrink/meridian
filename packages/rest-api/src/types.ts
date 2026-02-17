import type {
  AssignIssueUseCase,
  CreateIssueUseCase,
  CreateProjectUseCase,
  GetProjectOverviewUseCase,
  IAuditLogger,
  ICommentRepository,
  IIssueRepository,
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
  createProject: CreateProjectUseCase
  listIssues: ListIssuesUseCase
  updateIssue: UpdateIssueUseCase
  updateStatus: UpdateStatusUseCase
  assignIssue: AssignIssueUseCase
  getProjectOverview: GetProjectOverviewUseCase
  issueRepository: IIssueRepository
  commentRepository: ICommentRepository
  config?: RestApiConfig
}
