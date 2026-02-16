import type { IIssueRepository, Issue, IssueFilterParams, ProjectId } from '@meridian/core'

import { createRoute, z } from '@hono/zod-openapi'

import { createRouter } from '../router-factory.js'
import { LabelQuerySchema } from '../schemas/label-query.js'
import { createSuccessResponseSchema } from '../schemas/response-envelope.js'
import { TagResponseSchema } from '../schemas/tag.js'

interface LabelRouterDependencies {
  issueRepository: IIssueRepository
}

const listLabelsRoute = createRoute({
  method: 'get',
  path: '/labels',
  tags: ['Labels'],
  summary: 'List all unique labels/tags',
  request: {
    query: LabelQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: createSuccessResponseSchema(z.array(TagResponseSchema)),
        },
      },
      description: 'List of unique labels',
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

export function createLabelRouter(dependencies: LabelRouterDependencies) {
  const router = createRouter()

  router.openapi(listLabelsRoute, async (context) => {
    const { projectId } = context.req.valid('query')

    const filter: IssueFilterParams = projectId
      ? { projectId: projectId as ProjectId }
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
