import {
  AuthorizationError,
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from '@meridian/core'

interface GitHubErrorResponse {
  status?: number
  message?: string
  response?: {
    status?: number
    data?: {
      message?: string
      errors?: Array<{ field?: string, message?: string }>
    }
    headers?: Record<string, string>
  }
}

export function mapGitHubError(error: unknown): DomainError {
  const githubError = error as GitHubErrorResponse
  const status = githubError.response?.status ?? githubError.status
  const message = githubError.response?.data?.message ?? githubError.message ?? 'Unknown GitHub API error'

  if (status === 404) {
    return new NotFoundError('Issue', message)
  }

  if (status === 401 || status === 403) {
    return new AuthorizationError('access GitHub resource', message)
  }

  if (status === 422) {
    const firstFieldError = githubError.response?.data?.errors?.[0]
    const field = firstFieldError?.field ?? 'unknown'
    const fieldMessage = firstFieldError?.message ?? message
    return new ValidationError(field, fieldMessage)
  }

  if (status === 409) {
    return new ConflictError('Issue', 'unknown', message)
  }

  if (status === 429) {
    const resetTime = githubError.response?.headers?.['x-ratelimit-reset']
    const resetMessage = resetTime
      ? `Rate limited by GitHub API. Resets at ${new Date(Number(resetTime) * 1000).toISOString()}`
      : 'Rate limited by GitHub API'
    return new DomainError(resetMessage, 'RATE_LIMITED')
  }

  if (status !== undefined && status >= 500) {
    return new DomainError(`GitHub server error (${status}): ${message}`, 'GITHUB_SERVER_ERROR')
  }

  return new DomainError(`GitHub API error: ${message}`, 'GITHUB_ERROR')
}
