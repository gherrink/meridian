import type {
  AssignIssueUseCase,
  CreateIssueUseCase,
  CreateMilestoneUseCase,
  GetMilestoneOverviewUseCase,
  IAuditLogger,
  ICommentRepository,
  IIssueRepository,
  IMilestoneRepository,
  ListIssuesUseCase,
  UpdateIssueUseCase,
  UpdateStateUseCase,
} from '@meridian/core'

export interface McpServerConfig {
  name?: string
  version?: string
  includeTags?: ReadonlySet<string>
  excludeTags?: ReadonlySet<string>
}

export interface McpServerDependencies {
  createIssue: CreateIssueUseCase
  createMilestone: CreateMilestoneUseCase
  listIssues: ListIssuesUseCase
  updateIssue: UpdateIssueUseCase
  updateState: UpdateStateUseCase
  assignIssue: AssignIssueUseCase
  getMilestoneOverview: GetMilestoneOverviewUseCase
  issueRepository: IIssueRepository
  commentRepository: ICommentRepository
  milestoneRepository: IMilestoneRepository
  auditLogger?: IAuditLogger
}
