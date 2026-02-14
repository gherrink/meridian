/**
 * Direction for sorting results.
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Options for sorting query results.
 *
 * The `field` is a string representing the entity field to sort by.
 * Valid field names are adapter-specific; adapters should validate
 * and map field names to their backend's sort capabilities.
 */
export interface SortOptions {
  /** The entity field to sort by (e.g., 'createdAt', 'title', 'priority'). */
  field: string
  /** Sort direction: ascending or descending. */
  direction: SortDirection
}
