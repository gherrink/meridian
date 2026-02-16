export class ToolTagRegistry {
  private readonly tagsByToolName = new Map<string, ReadonlySet<string>>()

  register(name: string, tags: ReadonlySet<string>): void {
    this.tagsByToolName.set(name, tags)
  }

  getTagsForTool(name: string): ReadonlySet<string> {
    return this.tagsByToolName.get(name) ?? new Set()
  }

  getAll(): ReadonlyMap<string, ReadonlySet<string>> {
    return this.tagsByToolName
  }
}
