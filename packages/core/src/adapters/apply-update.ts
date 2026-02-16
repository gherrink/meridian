export function applyUpdate<T extends { updatedAt: Date }>(
  existing: T,
  input: Record<string, unknown>,
): T {
  const updated = { ...existing }

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      (updated as Record<string, unknown>)[key] = value
    }
  }

  updated.updatedAt = new Date()
  return updated
}
