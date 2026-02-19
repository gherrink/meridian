const API_VERSION = '0.1.0'

export const OPENAPI_CONFIG = {
  openapi: '3.1.0',
  info: {
    title: 'Meridian Heart API',
    version: API_VERSION,
    description: 'Unified interface for issue tracking systems. Provides REST endpoints for managing issues, comments, labels, tags, milestones, and users across multiple backends (GitHub Issues, JIRA, local tracker).',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'v1 API',
    },
  ],
  tags: [
    { name: 'System', description: 'Health and status endpoints' },
    { name: 'Issues', description: 'Issue management' },
    { name: 'Comments', description: 'Issue comments' },
    { name: 'Labels', description: 'Label/tag management' },
    { name: 'Tags', description: 'Tag management' },
    { name: 'Milestones', description: 'Milestone management and overviews' },
    { name: 'Users', description: 'User lookup and search' },
  ],
}
