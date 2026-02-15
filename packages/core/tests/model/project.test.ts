import { describe, expect, it } from 'vitest'

import {
  CreateProjectInputSchema,
  ProjectSchema,
  UpdateProjectInputSchema,
} from '../../src/model/project.js'
import { createProjectFixture, TEST_PROJECT_ID } from '../helpers/fixtures.js'

describe('projectSchema', () => {
  it('validates a complete project', () => {
    const input = createProjectFixture()

    const result = ProjectSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Test Project')
      expect(result.data.id).toBe(TEST_PROJECT_ID)
    }
  })

  it('applies default values for optional fields', () => {
    const input = {
      id: TEST_PROJECT_ID,
      name: 'Minimal Project',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = ProjectSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('')
      expect(result.data.metadata).toEqual({})
    }
  })

  it('validates a project with metadata', () => {
    const input = createProjectFixture({
      metadata: { owner: 'team-alpha', repoUrl: 'https://github.com/org/repo' },
    })

    const result = ProjectSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.metadata).toEqual({
        owner: 'team-alpha',
        repoUrl: 'https://github.com/org/repo',
      })
    }
  })

  it('rejects an empty name', () => {
    const input = createProjectFixture({ name: '' })

    const result = ProjectSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects a name exceeding 200 characters', () => {
    const input = createProjectFixture({ name: 'a'.repeat(201) })

    const result = ProjectSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = ProjectSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})

describe('createProjectInputSchema', () => {
  it('validates minimal input with only name', () => {
    const input = { name: 'New Project' }

    const result = CreateProjectInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('New Project')
      expect(result.data.description).toBe('')
      expect(result.data.metadata).toEqual({})
    }
  })

  it('validates input with all fields provided', () => {
    const input = {
      name: 'Full Project',
      description: 'A complete project',
      metadata: { team: 'backend' },
    }

    const result = CreateProjectInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('A complete project')
    }
  })

  it('rejects empty name', () => {
    const input = { name: '' }

    const result = CreateProjectInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('pR-01: accepts name at exactly 1 char', () => {
    // Act
    const result = CreateProjectInputSchema.safeParse({ name: 'X' })

    // Assert
    expect(result.success).toBe(true)
  })

  it('pR-02: accepts name at exactly 200 chars', () => {
    // Act
    const result = CreateProjectInputSchema.safeParse({ name: 'a'.repeat(200) })

    // Assert
    expect(result.success).toBe(true)
  })
})

describe('updateProjectInputSchema', () => {
  it('accepts an empty object since all fields are optional', () => {
    const result = UpdateProjectInputSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('validates a partial update with only name', () => {
    const input = { name: 'Updated Name' }

    const result = UpdateProjectInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Updated Name')
    }
  })

  it('validates a partial update with description and metadata', () => {
    const input = {
      description: 'Updated description',
      metadata: { archived: true },
    }

    const result = UpdateProjectInputSchema.safeParse(input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('Updated description')
    }
  })

  it('rejects an invalid name in update', () => {
    const input = { name: '' }

    const result = UpdateProjectInputSchema.safeParse(input)

    expect(result.success).toBe(false)
  })

  it('pR-03: rejects name exceeding 200', () => {
    // Arrange
    const input = { name: 'a'.repeat(201) }

    // Act
    const result = UpdateProjectInputSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})
