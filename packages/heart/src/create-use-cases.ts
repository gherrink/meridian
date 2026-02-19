import type { IAuditLogger } from '@meridian/core'

import type { AdapterSet } from './create-adapters.js'

import {
  AssignIssueUseCase,
  CreateCommentUseCase,
  CreateIssueUseCase,
  CreateMilestoneUseCase,
  DeleteCommentUseCase,
  DeleteIssueUseCase,
  DeleteMilestoneUseCase,
  GetCommentsByIssueUseCase,
  GetIssueUseCase,
  GetMilestoneOverviewUseCase,
  ListIssuesUseCase,
  ListMilestonesUseCase,
  ReparentIssueUseCase,
  UpdateCommentUseCase,
  UpdateIssueUseCase,
  UpdateMilestoneUseCase,
  UpdateStateUseCase,
} from '@meridian/core'

export interface UseCaseSet {
  createIssue: CreateIssueUseCase
  getIssue: GetIssueUseCase
  listIssues: ListIssuesUseCase
  updateIssue: UpdateIssueUseCase
  deleteIssue: DeleteIssueUseCase
  reparentIssue: ReparentIssueUseCase
  assignIssue: AssignIssueUseCase
  updateState: UpdateStateUseCase
  createMilestone: CreateMilestoneUseCase
  getMilestoneOverview: GetMilestoneOverviewUseCase
  listMilestones: ListMilestonesUseCase
  updateMilestone: UpdateMilestoneUseCase
  deleteMilestone: DeleteMilestoneUseCase
  createComment: CreateCommentUseCase
  getCommentsByIssue: GetCommentsByIssueUseCase
  updateComment: UpdateCommentUseCase
  deleteComment: DeleteCommentUseCase
}

export function createUseCases(adapters: AdapterSet, auditLogger: IAuditLogger): UseCaseSet {
  return {
    createIssue: new CreateIssueUseCase(adapters.issueRepository, auditLogger),
    getIssue: new GetIssueUseCase(adapters.issueRepository),
    listIssues: new ListIssuesUseCase(adapters.issueRepository),
    updateIssue: new UpdateIssueUseCase(adapters.issueRepository, auditLogger),
    deleteIssue: new DeleteIssueUseCase(adapters.issueRepository, auditLogger),
    reparentIssue: new ReparentIssueUseCase(adapters.issueRepository, auditLogger),
    assignIssue: new AssignIssueUseCase(adapters.issueRepository, adapters.userRepository, auditLogger),
    updateState: new UpdateStateUseCase(adapters.issueRepository, auditLogger),
    createMilestone: new CreateMilestoneUseCase(adapters.milestoneRepository, auditLogger),
    getMilestoneOverview: new GetMilestoneOverviewUseCase(adapters.milestoneRepository, adapters.issueRepository),
    listMilestones: new ListMilestonesUseCase(adapters.milestoneRepository),
    updateMilestone: new UpdateMilestoneUseCase(adapters.milestoneRepository, auditLogger),
    deleteMilestone: new DeleteMilestoneUseCase(adapters.milestoneRepository, auditLogger),
    createComment: new CreateCommentUseCase(adapters.commentRepository, auditLogger),
    getCommentsByIssue: new GetCommentsByIssueUseCase(adapters.commentRepository),
    updateComment: new UpdateCommentUseCase(adapters.commentRepository, auditLogger),
    deleteComment: new DeleteCommentUseCase(adapters.commentRepository, auditLogger),
  }
}
