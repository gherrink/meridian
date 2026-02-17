import type {
  AssignIssueUseCase,
  CreateIssueUseCase,
  CreateProjectUseCase,
  GetProjectOverviewUseCase,
  IAuditLogger,
  ICommentRepository,
  IIssueRepository,
  IProjectRepository,
  ListIssuesUseCase,
  UpdateIssueUseCase,
  UpdateStatusUseCase,
} from '@meridian/core'

export interface McpServerConfig {
  name?: string
  version?: string
  includeTags?: ReadonlySet<string>
  excludeTags?: ReadonlySet<string>
}

export interface McpServerDependencies {
  createIssue: CreateIssueUseCase
  createProject: CreateProjectUseCase
  listIssues: ListIssuesUseCase
  updateIssue: UpdateIssueUseCase
  updateStatus: UpdateStatusUseCase
  assignIssue: AssignIssueUseCase
  getProjectOverview: GetProjectOverviewUseCase
  issueRepository: IIssueRepository
  commentRepository: ICommentRepository
  projectRepository: IProjectRepository
  auditLogger?: IAuditLogger
}
