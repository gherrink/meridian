import type {
  AssignIssueUseCase,
  CreateIssueUseCase,
  GetProjectOverviewUseCase,
  ICommentRepository,
  IIssueRepository,
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
  listIssues: ListIssuesUseCase
  updateIssue: UpdateIssueUseCase
  updateStatus: UpdateStatusUseCase
  assignIssue: AssignIssueUseCase
  getProjectOverview: GetProjectOverviewUseCase
  issueRepository: IIssueRepository
  commentRepository: ICommentRepository
}
