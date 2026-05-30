/**
 * Client-safe helper: module + lesson id → bundle for `parseSchemaLessonBundle`.
 * (No Node built-ins — safe to import from client components.)
 */
import type { CourseModule } from '@/lib/schemas/module.schema'
import type { SchemaLessonBundle } from '@/lib/lesson-engine/engine'

export function toSchemaLessonBundle(mod: CourseModule, lessonId: string): SchemaLessonBundle {
  const lesson = mod.lessons.find((l) => l.id === lessonId)
  if (!lesson) {
    throw new Error(`Lesson "${lessonId}" not found in module "${mod.id}"`)
  }
  return {
    moduleCatalog: {
      grammarTargets: mod.grammarTargets,
      vocabTargets: mod.vocabTargets,
    },
    lesson,
  }
}
