/**
 * Heuristic micro-interaction count for lesson depth QA (preview taps, MCQ rounds, practice_loop items, etc.).
 * Aligns with `docs/product/m01-lesson-depth-standard.md` targets (~25–40 for Module 1).
 */
import type { Lesson } from '@/lib/schemas/lesson.schema'
import type { LessonStep } from '@/lib/schemas/lessonStep.schema'

export function estimateLessonMicroInteractions(lesson: Lesson): number {
  let n = 0
  for (const raw of lesson.steps) {
    const s = raw as LessonStep
    const c = s.content as Record<string, unknown> | undefined
    switch (s.type) {
      case 'preview': {
        const pv = c?.previewItems
        n += Array.isArray(pv) ? pv.length : 0
        break
      }
      case 'discovery': {
        const ph = c?.phrases
        n += Array.isArray(ph) ? ph.length : 0
        break
      }
      case 'grammar_card':
        n += 1
        break
      case 'listening':
      case 'listen_read':
      case 'scenario_chat': {
        const mcqs = (s.exercises ?? []).filter((e) => e.type === 'multiple_choice').length
        n += Math.max(mcqs, 1)
        break
      }
      case 'practice_loop':
        n += s.exercises?.length ?? 0
        break
      case 'mcq':
        n += 1
        break
      case 'reorder':
        n += 1
        break
      case 'fill_blank': {
        const follow = c?.followUpReorder as { tokens?: unknown } | undefined
        n += follow?.tokens ? 2 : 1
        break
      }
      case 'speaking':
      case 'writing':
        n += 1
        break
      case 'recap': {
        const tasks = c?.tasks
        n += Array.isArray(tasks) ? tasks.length : 0
        break
      }
      default:
        n += 1
    }
  }
  return n
}

/** Stage 6 modules (e.g. M01, M02) post–depth-upgrade floor (warn below this in validation). */
export const M01_MIN_MICRO_INTERACTIONS = 25
