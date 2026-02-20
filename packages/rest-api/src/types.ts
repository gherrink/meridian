import type {
  AssignIssueUseCase,
  CreateIssueLinkUseCase,
  CreateIssueUseCase,
  CreateMilestoneUseCase,
  DeleteIssueLinkUseCase,
  DeleteIssueUseCase,
  DeleteMilestoneUseCase,
  GetMilestoneOverviewUseCase,
  IAuditLogger,
  ICommentRepository,
  IIssueRepository,
  IMilestoneRepository,
  IUserRepository,
  ListIssueLinksUseCase,
  ListIssuesUseCase,
  ListMilestonesUseCase,
  ReparentIssueUseCase,
  UpdateIssueUseCase,
  UpdateMilestoneUseCase,
  UpdateStateUseCase,
} from '@meridian/core'

export interface RestApiConfig {
  corsOrigins?: string[]
  apiVersion?: string
}

export interface RestApiDependencies {
  auditLogger: IAuditLogger
  issueRepository: IIssueRepository
  milestoneRepository: IMilestoneRepository
  userRepository: IUserRepository
  commentRepository: ICommentRepository
  createIssue: CreateIssueUseCase
  listIssues: ListIssuesUseCase
  updateIssue: UpdateIssueUseCase
  deleteIssue: DeleteIssueUseCase
  reparentIssue: ReparentIssueUseCase
  updateState: UpdateStateUseCase
  assignIssue: AssignIssueUseCase
  createMilestone: CreateMilestoneUseCase
  getMilestoneOverview: GetMilestoneOverviewUseCase
  listMilestones: ListMilestonesUseCase
  updateMilestone: UpdateMilestoneUseCase
  deleteMilestone: DeleteMilestoneUseCase
  createIssueLink: CreateIssueLinkUseCase
  deleteIssueLink: DeleteIssueLinkUseCase
  listIssueLinks: ListIssueLinksUseCase
  config?: RestApiConfig
}
