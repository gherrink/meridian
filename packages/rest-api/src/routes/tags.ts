import type { IIssueRepository, Issue, IssueFilterParams, MilestoneId } from '@meridian/core'

import { createRoute, z } from '@hono/zod-openapi'

import { createRouter } from '../router-factory.js'
import { createSuccessResponseSchema } from '../schemas/response-envelope.js'
import { TagQuerySchema } from '../schemas/tag-query.js'
import { TagResponseSchema } from '../schemas/tag.js'

interface TagRouterDependencies {
  issueRepository: IIssueRepository
}

const listTagsRoute = createRoute({
  method: 'get',
  path: '/tags',
  tags: ['Tags'],
  summary: 'List all unique tags',
  request: {
    query: TagQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(z.array(TagResponseSchema)),
        },
      },
      description: 'List of unique tags',
    },
  },
})

async function fetchAllIssues(issueRepository: IIssueRepository, filter: IssueFilterParams): Promise<Issue[]> {
  const PAGE_SIZE = 100
  const allIssues: Issue[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const result = await issueRepository.list(filter, { page, limit: PAGE_SIZE })
    allIssues.push(...result.items)
    hasMore = result.hasMore
    page++
  }

  return allIssues
}

export function createTagRouter(dependencies: TagRouterDependencies) {
  const router = createRouter()

  router.openapi(listTagsRoute, async (context) => {
    const { milestoneId } = context.req.valid('query')

    const filter: IssueFilterParams = milestoneId
      ? { milestoneId: milestoneId as MilestoneId }
      : {}
    const allIssues = await fetchAllIssues(dependencies.issueRepository, filter)

    const tagsById = new Map<string, { id: string, name: string, color: string | null }>()

    for (const issue of allIssues) {
      for (const tag of issue.tags) {
        if (!tagsById.has(tag.id)) {
          tagsById.set(tag.id, { id: tag.id, name: tag.name, color: tag.color })
        }
      }
    }

    return context.json({ data: [...tagsById.values()] }, 200)
  })

  return router
}
