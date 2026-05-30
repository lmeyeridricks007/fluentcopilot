/**
 * Shared Zod primitives for content + user-state schemas.
 *
 * @example
 * ```ts
 * import { metadataSchema } from '@/lib/schemas/shared.schema'
 * const meta = metadataSchema.parse({ author: 'qa', version: 1 })
 * ```
 */
import { z } from 'zod'

/** Loose-but-typed bag for extensibility (no `any`). */
export const metadataSchema = z.record(z.string(), z.unknown()).optional()

/** Stable content or entity id (kebab-case or dotted recommended). */
export const idSchema = z.string().min(1, 'id is required')

/** ISO 8601 datetime string for APIs and persistence. */
export const isoDateTimeSchema = z.string().datetime({ offset: true })

/** Date-only or datetime for simpler fixtures. */
export const dateLikeSchema = z.union([z.string().datetime({ offset: true }), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])

export type Metadata = z.infer<typeof metadataSchema>
