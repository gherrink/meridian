import type { IssueId, MilestoneId } from '@meridian/core'

export class GitHubNumberCache {
  private readonly issues = new Map<IssueId, number>()
  private readonly milestones = new Map<MilestoneId, number>()
  private readonly deletedIssueIds = new Set<IssueId>()
  private readonly deletedMilestoneIds = new Set<MilestoneId>()
  private _issuesBulkLoaded = false
  private _milestonesBulkLoaded = false

  setIssue(id: IssueId, number: number): void {
    this.issues.set(id, number)
  }

  getIssue(id: IssueId): number | undefined {
    return this.issues.get(id)
  }

  deleteIssue(id: IssueId): void {
    this.issues.delete(id)
    this.deletedIssueIds.add(id)
  }

  isIssueDeleted(id: IssueId): boolean {
    return this.deletedIssueIds.has(id)
  }

  setMilestone(id: MilestoneId, number: number): void {
    this.milestones.set(id, number)
  }

  getMilestone(id: MilestoneId): number | undefined {
    return this.milestones.get(id)
  }

  deleteMilestone(id: MilestoneId): void {
    this.milestones.delete(id)
    this.deletedMilestoneIds.add(id)
  }

  isMilestoneDeleted(id: MilestoneId): boolean {
    return this.deletedMilestoneIds.has(id)
  }

  markIssuesBulkLoaded(): void {
    this._issuesBulkLoaded = true
  }

  get issuesBulkLoaded(): boolean {
    return this._issuesBulkLoaded
  }

  resetIssuesBulkLoaded(): void {
    this._issuesBulkLoaded = false
  }

  markMilestonesBulkLoaded(): void {
    this._milestonesBulkLoaded = true
  }

  get milestonesBulkLoaded(): boolean {
    return this._milestonesBulkLoaded
  }

  resetMilestonesBulkLoaded(): void {
    this._milestonesBulkLoaded = false
  }
}
