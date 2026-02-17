import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAuditLogger } from '../../src/adapters/in-memory-audit-logger.js'
import { InMemoryProjectRepository } from '../../src/adapters/in-memory-project-repository.js'
import { ConflictError, ValidationError } from '../../src/errors/domain-errors.js'
import { CreateProjectUseCase } from '../../src/use-cases/index.js'
import { TEST_USER_ID } from '../helpers/fixtures.js'

describe('createProjectUseCase', () => {
  let projectRepository: InMemoryProjectRepository
  let auditLogger: InMemoryAuditLogger
  let useCase: CreateProjectUseCase

  beforeEach(() => {
    projectRepository = new InMemoryProjectRepository()
    auditLogger = new InMemoryAuditLogger()
    useCase = new CreateProjectUseCase(projectRepository, auditLogger)
  })

  it('cP-01: creates project with valid name-only input', async () => {
    // Arrange
    const input = { name: 'New Project' }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.id).toBeDefined()
      expect(result.value.name).toBe('New Project')
      expect(result.value.createdAt).toBeInstanceOf(Date)
      expect(result.value.updatedAt).toBeInstanceOf(Date)
    }
  })

  it('cP-02: applies defaults for optional fields', async () => {
    // Arrange
    const input = { name: 'Minimal' }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBe('')
      expect(result.value.metadata).toEqual({})
    }
  })

  it('cP-03: preserves provided description', async () => {
    // Arrange
    const input = { name: 'P', description: 'Desc' }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBe('Desc')
    }
  })

  it('cP-04: preserves provided metadata', async () => {
    // Arrange
    const input = { name: 'P', metadata: { k: 'v' } }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.metadata).toEqual({ k: 'v' })
    }
  })

  it('cP-05: returns ValidationError for missing name', async () => {
    // Arrange
    const input = {}

    // Act
    const result = await useCase.execute(input as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cP-06: returns ValidationError for empty name', async () => {
    // Arrange
    const input = { name: '' }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cP-07: returns ValidationError for name exceeding 200 chars', async () => {
    // Arrange
    const input = { name: 'a'.repeat(201) }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cP-08: returns ValidationError for null input', async () => {
    // Act
    const result = await useCase.execute(null as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cP-09: returns ValidationError for number input', async () => {
    // Act
    const result = await useCase.execute(42 as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cP-10: returns ValidationError for string input', async () => {
    // Act
    const result = await useCase.execute('hello' as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('cP-11: logs audit entry on success', async () => {
    // Arrange
    const input = { name: 'Audited' }

    // Act
    await useCase.execute(input, TEST_USER_ID)

    // Assert
    const entries = auditLogger.getEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.operation).toBe('CreateProject')
    expect(entries[0]!.userId).toBe(TEST_USER_ID)
    expect((entries[0]!.metadata as Record<string, unknown>).projectId).toBeDefined()
  })

  it('cP-12: does not log audit on validation failure', async () => {
    // Arrange
    const input = { name: '' }

    // Act
    await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(auditLogger.getEntries()).toHaveLength(0)
  })

  it('cP-13: catches and wraps ConflictError', async () => {
    // Arrange
    const input = { name: 'Conflict' }
    const originalCreate = projectRepository.create.bind(projectRepository)
    projectRepository.create = async () => {
      throw new ConflictError('Project', 'x', 'duplicate name')
    }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ConflictError)
      expect(result.error.code).toBe('CONFLICT')
    }
  })

  it('cP-14: rethrows non-domain errors', async () => {
    // Arrange
    const input = { name: 'Crash' }
    projectRepository.create = async () => {
      throw new Error('DB down')
    }

    // Act & Assert
    await expect(useCase.execute(input, TEST_USER_ID)).rejects.toThrow('DB down')
  })

  it('cP-15: name at max length (200) accepted', async () => {
    // Arrange
    const input = { name: 'a'.repeat(200) }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name.length).toBe(200)
    }
  })

  // Edge Cases

  it('eP-01: name with 200 chars is valid', async () => {
    // Arrange
    const input = { name: 'a'.repeat(200) }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(true)
  })

  it('eP-02: name with 201 chars is invalid', async () => {
    // Arrange
    const input = { name: 'a'.repeat(201) }

    // Act
    const result = await useCase.execute(input, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })

  it('eP-03: undefined input', async () => {
    // Act
    const result = await useCase.execute(undefined as any, TEST_USER_ID)

    // Assert
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError)
    }
  })
})
