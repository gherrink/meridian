import type {
  AssignIssueUseCase,
  CreateIssueUseCase,
  CreateMilestoneUseCase,
  GetMilestoneOverviewUseCase,
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
  createMilestone: CreateMilestoneUseCase
  listIssues: ListIssuesUseCase
  updateIssue: UpdateIssueUseCase
  updateStatus: UpdateStatusUseCase
  assignIssue: AssignIssueUseCase
  getMilestoneOverview: GetMilestoneOverviewUseCase
  issueRepository: IIssueRepository
  commentRepository: ICommentRepository
  config?: RestApiConfig
}
