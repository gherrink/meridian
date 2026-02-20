import { z } from 'zod'

export const RelationshipTypeSchema = z.object({
  name: z.string().min(1),
  forwardLabel: z.string().min(1),
  inverseLabel: z.string().min(1),
  symmetric: z.boolean(),
})

export type RelationshipType = z.infer<typeof RelationshipTypeSchema>

export const DEFAULT_RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  {
    name: 'blocks',
    forwardLabel: 'blocks',
    inverseLabel: 'is blocked by',
    symmetric: false,
  },
  {
    name: 'duplicates',
    forwardLabel: 'duplicates',
    inverseLabel: 'is duplicated by',
    symmetric: false,
  },
  {
    name: 'relates-to',
    forwardLabel: 'relates to',
    inverseLabel: 'relates to',
    symmetric: true,
  },
] as const
