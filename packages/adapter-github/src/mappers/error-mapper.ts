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

  if (status === 401) {
    return new AuthorizationError('access GitHub resource', 'Invalid or expired authentication token')
  }

  if (status === 403) {
    if (isSecondaryRateLimit(githubError)) {
      return buildRateLimitError(githubError)
    }
    return buildForbiddenError(githubError)
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
    return buildRateLimitError(githubError)
  }

  if (status !== undefined && status >= 500) {
    return new DomainError(`GitHub server error (${status}): ${message}`, 'GITHUB_SERVER_ERROR')
  }

  return new DomainError(`GitHub API error: ${message}`, 'GITHUB_ERROR')
}

function isSecondaryRateLimit(githubError: GitHubErrorResponse): boolean {
  const retryAfter = githubError.response?.headers?.['retry-after']
  if (retryAfter !== undefined) {
    return true
  }

  const message = githubError.response?.data?.message?.toLowerCase() ?? ''
  return message.includes('rate limit') || message.includes('abuse detection')
}

function buildRateLimitError(githubError: GitHubErrorResponse): DomainError {
  const retryAfter = githubError.response?.headers?.['retry-after']
  const resetTime = githubError.response?.headers?.['x-ratelimit-reset']

  if (retryAfter !== undefined) {
    return new DomainError(`Rate limited by GitHub API. Retry after ${retryAfter} seconds`, 'RATE_LIMITED')
  }

  if (resetTime !== undefined) {
    return new DomainError(
      `Rate limited by GitHub API. Resets at ${new Date(Number(resetTime) * 1000).toISOString()}`,
      'RATE_LIMITED',
    )
  }

  return new DomainError('Rate limited by GitHub API', 'RATE_LIMITED')
}

function buildForbiddenError(githubError: GitHubErrorResponse): AuthorizationError {
  const requiredPermissions = githubError.response?.headers?.['x-accepted-github-permissions']

  const reason = requiredPermissions
    ? `Insufficient permissions. Required: ${requiredPermissions}`
    : 'Insufficient permissions. Check that the token has the required scopes (repo, public_repo, read:org)'

  return new AuthorizationError('access GitHub resource', reason)
}
