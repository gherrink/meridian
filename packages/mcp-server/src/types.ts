import type {
  AssignIssueUseCase,
  CreateCommentUseCase,
  CreateIssueLinkUseCase,
  CreateIssueUseCase,
  CreateMilestoneUseCase,
  DeleteCommentUseCase,
  DeleteIssueLinkUseCase,
  DeleteIssueUseCase,
  DeleteMilestoneUseCase,
  GetCommentsByIssueUseCase,
  GetMilestoneOverviewUseCase,
  IAuditLogger,
  IIssueRepository,
  ListIssueLinksUseCase,
  ListIssuesUseCase,
  ListMilestonesUseCase,
  ReparentIssueUseCase,
  UpdateCommentUseCase,
  UpdateIssueUseCase,
  UpdateMilestoneUseCase,
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
  listMilestones: ListMilestonesUseCase
  updateMilestone: UpdateMilestoneUseCase
  deleteMilestone: DeleteMilestoneUseCase
  deleteIssue: DeleteIssueUseCase
  reparentIssue: ReparentIssueUseCase
  createComment: CreateCommentUseCase
  updateComment: UpdateCommentUseCase
  deleteComment: DeleteCommentUseCase
  getCommentsByIssue: GetCommentsByIssueUseCase
  createIssueLink: CreateIssueLinkUseCase
  deleteIssueLink: DeleteIssueLinkUseCase
  listIssueLinks: ListIssueLinksUseCase
  issueRepository: IIssueRepository
  auditLogger?: IAuditLogger
}
