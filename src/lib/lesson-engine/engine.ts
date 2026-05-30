/**
 * Types + parsing for bundled schema lesson payloads (lesson + module catalog).
 */
import { z } from 'zod'
import { grammarTargetSchema } from '@/lib/schemas/grammarTarget.schema'
import { lessonSchema } from '@/lib/schemas/lesson.schema'
import { vocabTargetSchema } from '@/lib/schemas/vocabTarget.schema'
import type { Lesson } from '@/lib/schemas/lesson.schema'
import type { ModuleCatalog } from '@/lib/lesson-engine/reviewExtractor'

export const schemaLessonBundleSchema = z.object({
  moduleCatalog: z.object({
    grammarTargets: z.array(grammarTargetSchema),
    vocabTargets: z.array(vocabTargetSchema),
  }),
  lesson: lessonSchema,
})

export type SchemaLessonBundle = z.infer<typeof schemaLessonBundleSchema>

export function parseSchemaLessonBundle(data: unknown): SchemaLessonBundle {
  return schemaLessonBundleSchema.parse(data)
}

export function assertLessonCatalogRefs(lesson: Lesson, catalog: ModuleCatalog): void {
  const gIds = new Set(catalog.grammarTargets.map((x) => x.id))
  const vIds = new Set(catalog.vocabTargets.map((x) => x.id))
  for (const id of lesson.grammarTargets) {
    if (!gIds.has(id)) throw new Error(`Unknown grammar target id on lesson: ${id}`)
  }
  for (const id of lesson.vocabTargets) {
    if (!vIds.has(id)) throw new Error(`Unknown vocab target id on lesson: ${id}`)
  }
}

/** Optional: speak scoring mock — returns 0–1 */
export function mockPronunciationScore(_phrase?: string, _said?: string): number {
  return 0.78 + Math.random() * 0.2
}
