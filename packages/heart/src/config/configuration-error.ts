import { DomainError } from '@meridian/core'

export interface ConfigurationIssue {
  field: string
  message: string
}

export class ConfigurationError extends DomainError {
  public readonly issues: readonly ConfigurationIssue[]

  constructor(issues: ConfigurationIssue[]) {
    const formattedIssues = issues
      .map(issue => `  - ${issue.field}: ${issue.message}`)
      .join('\n')
    super(
      `Configuration validation failed:\n${formattedIssues}`,
      'CONFIGURATION_ERROR',
    )
    this.issues = Object.freeze([...issues])
  }
}
