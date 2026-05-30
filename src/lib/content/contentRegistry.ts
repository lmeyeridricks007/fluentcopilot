/**
 * Central index for lookups by id (lessons, modules, grammar, vocab) without duplication in memory.
 */
import type { Course } from '@/lib/schemas/course.schema'
import type { CourseModule } from '@/lib/schemas/module.schema'
import type { Lesson } from '@/lib/schemas/lesson.schema'
import type { GrammarTarget } from '@/lib/schemas/grammarTarget.schema'
import type { VocabTarget } from '@/lib/schemas/vocabTarget.schema'

export type ContentRegistry = {
  courseId: string
  modulesById: Map<string, CourseModule>
  lessonsById: Map<string, Lesson>
  lessonModuleId: Map<string, string>
  grammarById: Map<string, GrammarTarget>
  vocabById: Map<string, VocabTarget>
}

export function buildContentRegistry(course: Course): ContentRegistry {
  const modulesById = new Map<string, CourseModule>()
  const lessonsById = new Map<string, Lesson>()
  const lessonModuleId = new Map<string, string>()
  const grammarById = new Map<string, GrammarTarget>()
  const vocabById = new Map<string, VocabTarget>()

  for (const mod of course.modules) {
    modulesById.set(mod.id, mod)
    for (const g of mod.grammarTargets) {
      if (grammarById.has(g.id)) {
        console.warn(`[contentRegistry] duplicate grammar id across modules: ${g.id}`)
      }
      grammarById.set(g.id, g)
    }
    for (const v of mod.vocabTargets) {
      if (vocabById.has(v.id)) {
        console.warn(`[contentRegistry] duplicate vocab id across modules: ${v.id}`)
      }
      vocabById.set(v.id, v)
    }
    for (const lesson of mod.lessons) {
      if (lessonsById.has(lesson.id)) {
        console.warn(`[contentRegistry] duplicate lesson id: ${lesson.id}`)
      }
      lessonsById.set(lesson.id, lesson)
      lessonModuleId.set(lesson.id, mod.id)
    }
  }

  return {
    courseId: course.id,
    modulesById,
    lessonsById,
    lessonModuleId,
    grammarById,
    vocabById,
  }
}

export function getLessonWithModule(reg: ContentRegistry, lessonId: string): { lesson: Lesson; module: CourseModule } | null {
  const mid = reg.lessonModuleId.get(lessonId)
  if (!mid) return null
  const courseModule = reg.modulesById.get(mid)
  const lesson = reg.lessonsById.get(lessonId)
  if (!courseModule || !lesson) return null
  return { lesson, module: courseModule }
}
