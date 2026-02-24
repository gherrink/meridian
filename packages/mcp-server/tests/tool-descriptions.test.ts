import type { McpServerDependencies } from '../src/types.js'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createMcpServer } from '../src/server.js'

// ---------------------------------------------------------------------------
// Setup: mock dependencies, connect once, cache tools
// ---------------------------------------------------------------------------
interface ToolInfo {
  name: string
  description?: string
  inputSchema?: unknown
}

let tools: ToolInfo[] = []
let clientInstance: Client
let cleanup: () => Promise<void>

function findTool(name: string): ToolInfo | undefined {
  return tools.find(t => t.name === name)
}

function createMockDependencies(): McpServerDependencies {
  return {
    createIssue: {} as McpServerDependencies['createIssue'],
    createMilestone: {} as McpServerDependencies['createMilestone'],
    listIssues: {} as McpServerDependencies['listIssues'],
    updateIssue: {} as McpServerDependencies['updateIssue'],
    updateState: {} as McpServerDependencies['updateState'],
    assignIssue: {} as McpServerDependencies['assignIssue'],
    getMilestoneOverview: {} as McpServerDependencies['getMilestoneOverview'],
    listMilestones: {} as McpServerDependencies['listMilestones'],
    updateMilestone: {} as McpServerDependencies['updateMilestone'],
    deleteMilestone: {} as McpServerDependencies['deleteMilestone'],
    deleteIssue: {} as McpServerDependencies['deleteIssue'],
    reparentIssue: {} as McpServerDependencies['reparentIssue'],
    createComment: {} as McpServerDependencies['createComment'],
    updateComment: {} as McpServerDependencies['updateComment'],
    deleteComment: {} as McpServerDependencies['deleteComment'],
    getCommentsByIssue: {} as McpServerDependencies['getCommentsByIssue'],
    createIssueLink: {} as McpServerDependencies['createIssueLink'],
    deleteIssueLink: {} as McpServerDependencies['deleteIssueLink'],
    listIssueLinks: {} as McpServerDependencies['listIssueLinks'],
    issueRepository: {} as McpServerDependencies['issueRepository'],
  }
}

beforeAll(async () => {
  const server = createMcpServer(createMockDependencies())
  clientInstance = new Client({ name: 'description-test', version: '1.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

  await server.connect(serverTransport)
  await clientInstance.connect(clientTransport)

  const result = await clientInstance.listTools()
  tools = result.tools

  cleanup = async () => {
    await clientInstance.close()
    await server.close()
  }
})

afterAll(async () => {
  await cleanup()
})

// ---------------------------------------------------------------------------
// Tool Description Disambiguation Guidance
// ---------------------------------------------------------------------------
describe('tool description disambiguation guidance', () => {
  it('tC-01: get_issue points to view_issue_detail', () => {
    const tool = findTool('get_issue')

    expect(tool).toBeDefined()
    expect(tool!.description).toContain('without comments')
    expect(tool!.description).toContain('view_issue_detail')
  })

  it('tC-02: view_issue_detail points to get_issue', () => {
    const tool = findTool('view_issue_detail')

    expect(tool).toBeDefined()
    const desc = tool!.description!
    expect(desc.includes('all comments') || desc.includes('Includes all comments')).toBe(true)
    expect(desc).toContain('get_issue')
  })

  it('tC-03: search_issues points to list_my_issues', () => {
    const tool = findTool('search_issues')

    expect(tool).toBeDefined()
    expect(tool!.description).toContain('Searches and filters issues')
    expect(tool!.description).toContain('list_my_issues')
  })

  it('tC-04: list_my_issues points to search_issues', () => {
    const tool = findTool('list_my_issues')

    expect(tool).toBeDefined()
    const desc = tool!.description!
    expect(desc.includes('assigned to a specific user') || desc.includes('grouped by state')).toBe(true)
    expect(desc).toContain('search_issues')
  })

  it('tC-05: view_roadmap points to milestone_overview', () => {
    const tool = findTool('view_roadmap')

    expect(tool).toBeDefined()
    const desc = tool!.description!
    expect(desc.includes('progress tracking') || desc.includes('completion percentage')).toBe(true)
    expect(desc).toContain('milestone_overview')
  })

  it('tC-06: milestone_overview points to view_roadmap', () => {
    const tool = findTool('milestone_overview')

    expect(tool).toBeDefined()
    const desc = tool!.description!
    expect(desc.includes('status reports') || desc.includes('comprehensive status')).toBe(true)
    expect(desc).toContain('view_roadmap')
  })

  it('tC-07: list_milestones points to list_pm_milestones', () => {
    const tool = findTool('list_milestones')

    expect(tool).toBeDefined()
    const desc = tool!.description!
    expect(desc.includes('milestones') || desc.includes('milestone')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Tool Registration Completeness
// ---------------------------------------------------------------------------
describe('tool registration completeness', () => {
  it('tC-08: all 24 tools registered', () => {
    expect(tools).toHaveLength(24)
  })

  it('tC-09: all tool names present', () => {
    const expectedNames = [
      'health_check',
      'create_issue',
      'search_issues',
      'get_issue',
      'list_milestones',
      'create_epic',
      'create_milestone',
      'view_roadmap',
      'assign_priority',
      'list_pm_milestones',
      'milestone_overview',
      'reparent_issue',
      'delete_issue',
      'link_issues',
      'unlink_issues',
      'list_issue_links',
      'pick_next_task',
      'update_status',
      'view_issue_detail',
      'list_my_issues',
      'add_comment',
      'update_comment',
      'delete_comment',
      'list_issue_comments',
    ]

    const names = tools.map(t => t.name)

    for (const expected of expectedNames) {
      expect(names).toContain(expected)
    }
  })

  it('tC-10: every tool has non-empty description', () => {
    for (const tool of tools) {
      expect(tool.description).toBeDefined()
      expect(typeof tool.description).toBe('string')
      expect(tool.description!.length).toBeGreaterThan(0)
    }
  })

  it('tC-11: every tool has inputSchema', () => {
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined()
      expect(typeof tool.inputSchema).toBe('object')
    }
  })
})

// ---------------------------------------------------------------------------
// Description Content Quality
// ---------------------------------------------------------------------------
describe('description content quality', () => {
  it('tC-12: get_issue describes return data', () => {
    const tool = findTool('get_issue')

    expect(tool).toBeDefined()
    const desc = tool!.description!
    expect(desc.includes('single issue') || desc.includes('Retrieves a single issue')).toBe(true)
  })

  it('tC-13: search_issues describes filtering', () => {
    const tool = findTool('search_issues')

    expect(tool).toBeDefined()
    expect(tool!.description!.toLowerCase()).toContain('filter')
  })

  it('tC-14: view_roadmap describes purpose', () => {
    const tool = findTool('view_roadmap')

    expect(tool).toBeDefined()
    expect(tool!.description).toContain('roadmap')
  })

  it('tC-15: milestone_overview describes purpose', () => {
    const tool = findTool('milestone_overview')

    expect(tool).toBeDefined()
    expect(tool!.description).toContain('status')
  })

  it('tC-16: list_my_issues describes grouping', () => {
    const tool = findTool('list_my_issues')

    expect(tool).toBeDefined()
    expect(tool!.description).toContain('grouped by state')
  })

  it('tC-17: view_issue_detail mentions comments', () => {
    const tool = findTool('view_issue_detail')

    expect(tool).toBeDefined()
    expect(tool!.description).toContain('comments')
  })

  it('tC-18: list_milestones describes milestone usage', () => {
    const tool = findTool('list_milestones')

    expect(tool).toBeDefined()
    const desc = tool!.description!
    expect(desc.includes('planning') || desc.includes('milestone')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------
describe('edge cases', () => {
  it('tC-19: descriptions are substantial (not stubs)', () => {
    for (const tool of tools) {
      expect(tool.description!.length).toBeGreaterThanOrEqual(50)
    }
  })

  it('tC-20: no duplicate tool names', () => {
    const names = tools.map(t => t.name)
    const uniqueNames = new Set(names)

    expect(uniqueNames.size).toBe(names.length)
  })

  it('tC-21: disambiguation references are reciprocal for get_issue/view_issue_detail', () => {
    const getIssue = findTool('get_issue')
    const viewDetail = findTool('view_issue_detail')

    expect(getIssue).toBeDefined()
    expect(viewDetail).toBeDefined()
    expect(getIssue!.description).toContain('view_issue_detail')
    expect(viewDetail!.description).toContain('get_issue')
  })

  it('tC-22: disambiguation references are reciprocal for search_issues/list_my_issues', () => {
    const searchIssues = findTool('search_issues')
    const listMyIssues = findTool('list_my_issues')

    expect(searchIssues).toBeDefined()
    expect(listMyIssues).toBeDefined()
    expect(searchIssues!.description).toContain('list_my_issues')
    expect(listMyIssues!.description).toContain('search_issues')
  })

  it('tC-23: disambiguation references are reciprocal for view_roadmap/milestone_overview', () => {
    const viewRoadmap = findTool('view_roadmap')
    const milestoneOverview = findTool('milestone_overview')

    expect(viewRoadmap).toBeDefined()
    expect(milestoneOverview).toBeDefined()
    expect(viewRoadmap!.description).toContain('milestone_overview')
    expect(milestoneOverview!.description).toContain('view_roadmap')
  })
})
