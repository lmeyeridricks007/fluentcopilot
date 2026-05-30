/**
 * Library validation: Zod + reference checks + pedagogy + contentRules limits.
 */
import { courseSchema, type Course } from '@/lib/schemas/course.schema'
import type { CourseModule } from '@/lib/schemas/module.schema'
import { moduleSchema } from '@/lib/schemas/module.schema'
import type { Lesson } from '@/lib/schemas/lesson.schema'
import type { LessonStep } from '@/lib/schemas/lessonStep.schema'
import { reviewItemSchema, type ReviewItem } from '@/lib/schemas/reviewItem.schema'
import {
  INPUT_STEP_TYPES,
  OUTPUT_STEP_TYPES,
  RECAP_STEP_TYPE,
  MAX_STEP_PROMPT_CHARS,
  MAX_MCQ_QUESTION_CHARS,
  LESSON_DURATION_MIN,
  LESSON_DURATION_MAX,
  isLikelyValidId,
} from '@/lib/content-generation/contentRules'
import { suggestedReviewItemRefsForLesson } from '@/lib/content/reviewItemExtractor'
import {
  estimateLessonMicroInteractions,
  M01_MIN_MICRO_INTERACTIONS,
} from '@/lib/content/lessonMicroInteractions'

export type ValidationSeverity = 'error' | 'warn' | 'info'

export type ValidationIssue = {
  code: string
  message: string
  path?: string
  severity: ValidationSeverity
}

export type ValidationReport = {
  ok: boolean
  issues: ValidationIssue[]
}

function issue(
  severity: ValidationSeverity,
  code: string,
  message: string,
  path?: string
): ValidationIssue {
  return { severity, code, message, path }
}

function stepTypes(lesson: Lesson): Set<string> {
  return new Set(lesson.steps.map((s) => (s as LessonStep).type))
}

export function validateLessonPedagogy(lesson: Lesson, options?: { moduleId?: string }): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const types = stepTypes(lesson)
  const hasInput = [...INPUT_STEP_TYPES].some((t) => types.has(t))
  const hasOutput = [...OUTPUT_STEP_TYPES].some((t) => types.has(t))
  const hasRecap = types.has(RECAP_STEP_TYPE)

  const depthStandardModules = new Set([
    'a2-m01-people-daily',
    'a2-m02-food-shopping',
    'a2-m03-plans-social-life',
    'a2-m04-work-professional',
    'a2-m05-housing-services',
    'a2-m06-health-doctor',
    'a2-m07-transport-getting-around',
    'a2-m08-government-administration',
    'a2-m09-leisure-culture-conversations',
    'a2-m10-unexpected-situations-problem-solving',
  ])
  if (options?.moduleId && depthStandardModules.has(options.moduleId)) {
    const est = estimateLessonMicroInteractions(lesson)
    if (est < M01_MIN_MICRO_INTERACTIONS) {
      issues.push(
        issue(
          'warn',
          'STAGE6_INTERACTION_DENSITY',
          `Estimated micro-interactions ~${est} (target ≥${M01_MIN_MICRO_INTERACTIONS} for Stage 6 depth standard).`,
          `lessons.${lesson.id}`
        )
      )
    }
  }

  if (!hasInput) {
    issues.push(
      issue('warn', 'PEDAGOGY_INPUT', 'Lesson should include at least one input-style step (listening, mcq, reorder, fill_blank, discovery, listen_read).', `lessons.${lesson.id}`)
    )
  }
  if (!hasOutput) {
    issues.push(
      issue('warn', 'PEDAGOGY_OUTPUT', 'Lesson should include at least one output step (speaking, writing, scenario_chat).', `lessons.${lesson.id}`)
    )
  }
  if (!hasRecap) {
    issues.push(
      issue('warn', 'PEDAGOGY_RECAP', 'Lesson should end with a recap step for spaced reinforcement UX.', `lessons.${lesson.id}`)
    )
  }

  if (lesson.durationEstimate < LESSON_DURATION_MIN || lesson.durationEstimate > LESSON_DURATION_MAX) {
    issues.push(
      issue(
        'info',
        'DURATION_BAND',
        `durationEstimate ${lesson.durationEstimate} is outside typical mobile band ${LESSON_DURATION_MIN}–${LESSON_DURATION_MAX} min.`,
        `lessons.${lesson.id}.durationEstimate`
      )
    )
  }

  if (!lesson.grammarTargets.length) {
    issues.push(issue('warn', 'GRAMMAR_EMPTY', 'No grammarTargets — ensure module spine alignment.', `lessons.${lesson.id}.grammarTargets`))
  }
  if (!lesson.vocabTargets.length) {
    issues.push(issue('warn', 'VOCAB_EMPTY', 'No vocabTargets — SRS extraction will be thin.', `lessons.${lesson.id}.vocabTargets`))
  }

  return issues
}

export function validateLessonStepUX(lesson: Lesson): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const raw of lesson.steps) {
    const s = raw as LessonStep
    const p = s.prompt
    if (p && p.length > MAX_STEP_PROMPT_CHARS) {
      issues.push(
        issue('warn', 'PROMPT_LONG', `Step ${s.id} prompt exceeds ${MAX_STEP_PROMPT_CHARS} chars (mobile UX).`, `${lesson.id}.steps.${s.id}.prompt`)
      )
    }
    if (s.exercises?.length) {
      for (const ex of s.exercises) {
        if (ex.question && ex.question.length > MAX_MCQ_QUESTION_CHARS) {
          issues.push(
            issue('warn', 'MCQ_LONG', `Exercise ${ex.id} question very long.`, `${lesson.id}.steps.${s.id}.exercises.${ex.id}`)
          )
        }
      }
    }
    const interactive = [
      'mcq',
      'reorder',
      'fill_blank',
      'speaking',
      'writing',
      'listening',
      'practice_loop',
      'listen_read',
      'scenario_chat',
    ].includes(s.type)
    if (interactive && !s.feedbackConfig && s.type !== 'listening') {
      issues.push(
        issue('info', 'FEEDBACK_MISSING', `Consider feedbackConfig on ${s.type} step ${s.id}.`, `${lesson.id}.steps.${s.id}`)
      )
    }
  }
  return issues
}

export function validateLessonRefs(lesson: Lesson, module: CourseModule): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const g = new Set(module.grammarTargets.map((x) => x.id))
  const v = new Set(module.vocabTargets.map((x) => x.id))
  for (const id of lesson.grammarTargets) {
    if (!g.has(id)) issues.push(issue('error', 'BAD_GRAMMAR_REF', `Unknown grammarTargets id "${id}"`, `${lesson.id}.grammarTargets`))
  }
  for (const id of lesson.vocabTargets) {
    if (!v.has(id)) issues.push(issue('error', 'BAD_VOCAB_REF', `Unknown vocabTargets id "${id}"`, `${lesson.id}.vocabTargets`))
  }
  if (lesson.moduleId !== module.id) {
    issues.push(
      issue('error', 'MODULE_MISMATCH', `lesson.moduleId ${lesson.moduleId} !== module ${module.id}`, `${lesson.id}.moduleId`)
    )
  }
  return issues
}

export function validateReviewRefs(lesson: Lesson, availableReviewIds: Set<string>): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const refs = lesson.reviewItemRefs ?? []
  for (const ref of refs) {
    if (!availableReviewIds.has(ref)) {
      issues.push(issue('error', 'BAD_REVIEW_REF', `reviewItemRefs unknown id "${ref}"`, `${lesson.id}.reviewItemRefs`))
    }
  }
  return issues
}

export function validateLessonReviewCoverage(lesson: Lesson, module: CourseModule): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const suggested = new Set(suggestedReviewItemRefsForLesson(lesson, module))
  const refs = new Set(lesson.reviewItemRefs ?? [])
  if (refs.size === 0 && suggested.size > 0) {
    issues.push(
      issue(
        'warn',
        'REVIEW_REFS_EMPTY',
        `reviewItemRefs is empty but extractor would produce ${suggested.size} item(s). Run extract-review-items or add refs.`,
        `${lesson.id}.reviewItemRefs`
      )
    )
  }
  for (const r of refs) {
    if (!suggested.has(r)) {
      issues.push(
        issue('info', 'REVIEW_REF_EXTRA', `reviewItemRef "${r}" not produced by default extractor (may be hand-authored).`, `${lesson.id}.reviewItemRefs`)
      )
    }
  }
  return issues
}

export function validateLessonIds(lesson: Lesson): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!isLikelyValidId(lesson.id)) {
    issues.push(issue('warn', 'ID_STYLE', `Lesson id "${lesson.id}" should be kebab-case without spaces.`, `${lesson.id}`))
  }
  const seen = new Set<string>()
  for (const raw of lesson.steps) {
    const s = raw as LessonStep
    if (seen.has(s.id)) issues.push(issue('error', 'DUP_STEP', `Duplicate step id ${s.id}`, `${lesson.id}.steps`))
    seen.add(s.id)
    if (!isLikelyValidId(s.id)) {
      issues.push(issue('warn', 'ID_STYLE', `Step id "${s.id}" should be kebab-case.`, `${lesson.id}.steps.${s.id}`))
    }
  }
  return issues
}

export function validateModule(mod: CourseModule, reviewItemsById?: Set<string>): ValidationReport {
  const parsed = moduleSchema.safeParse(mod)
  const issues: ValidationIssue[] = []
  if (!parsed.success) {
    issues.push(issue('error', 'ZOD_MODULE', parsed.error.message, 'module'))
    return { ok: false, issues }
  }

  const m = parsed.data
  const g = new Set<string>()
  for (const t of m.grammarTargets) {
    if (g.has(t.id)) issues.push(issue('error', 'DUP_GRAMMAR', `Duplicate grammar id ${t.id}`, 'grammarTargets'))
    g.add(t.id)
  }
  const v = new Set<string>()
  for (const t of m.vocabTargets) {
    if (v.has(t.id)) issues.push(issue('error', 'DUP_VOCAB', `Duplicate vocab id ${t.id}`, 'vocabTargets'))
    v.add(t.id)
  }
  const lids = new Set<string>()
  for (const l of m.lessons) {
    if (lids.has(l.id)) issues.push(issue('error', 'DUP_LESSON', `Duplicate lesson id ${l.id}`, 'lessons'))
    lids.add(l.id)
  }

  for (const lesson of m.lessons) {
    issues.push(...validateLessonIds(lesson))
    issues.push(...validateLessonRefs(lesson, m))
    issues.push(...validateLessonPedagogy(lesson, { moduleId: m.id }))
    issues.push(...validateLessonStepUX(lesson))
    issues.push(...validateLessonReviewCoverage(lesson, m))
    if (reviewItemsById) {
      issues.push(...validateReviewRefs(lesson, reviewItemsById))
    }
  }

  const errors = issues.filter((i) => i.severity === 'error')
  return { ok: errors.length === 0, issues }
}

export function validateCourse(
  course: Course,
  options?: { reviewItems?: ReviewItem[] }
): ValidationReport {
  const parsed = courseSchema.safeParse(course)
  const issues: ValidationIssue[] = []
  if (!parsed.success) {
    issues.push(issue('error', 'ZOD_COURSE', parsed.error.message, 'course'))
    return { ok: false, issues }
  }

  const c = parsed.data
  const modIds = new Set<string>()
  for (const mod of c.modules) {
    if (modIds.has(mod.id)) issues.push(issue('error', 'DUP_MODULE', `Duplicate module ${mod.id}`, 'modules'))
    modIds.add(mod.id)
  }

  const reviewSet = options?.reviewItems ? new Set(options.reviewItems.map((r) => r.id)) : undefined
  const globalSteps = new Map<string, string>()

  for (const mod of c.modules) {
    const mr = validateModule(mod, reviewSet)
    issues.push(...mr.issues.map((i) => ({ ...i, path: i.path ? `${mod.id}/${i.path}` : mod.id })))
    for (const lesson of mod.lessons) {
      for (const raw of lesson.steps) {
        const s = raw as LessonStep
        if (globalSteps.has(s.id)) {
          issues.push(
            issue(
              'warn',
              'GLOBAL_DUP_STEP',
              `Step id ${s.id} reused in lesson ${lesson.id} and ${globalSteps.get(s.id)}`,
              `${mod.id}/${lesson.id}/${s.id}`
            )
          )
        } else {
          globalSteps.set(s.id, lesson.id)
        }
      }
    }
  }

  const errors = issues.filter((i) => i.severity === 'error')
  return { ok: errors.length === 0, issues }
}

export function formatValidationReport(report: ValidationReport): string {
  const lines: string[] = []
  const bySev = { error: report.issues.filter((i) => i.severity === 'error'), warn: report.issues.filter((i) => i.severity === 'warn'), info: report.issues.filter((i) => i.severity === 'info') }
  lines.push(`status: ${report.ok ? 'OK' : 'FAILED'}`)
  for (const sev of ['error', 'warn', 'info'] as const) {
    for (const i of bySev[sev]) {
      lines.push(`[${sev.toUpperCase()}] ${i.code}: ${i.message}${i.path ? ` @ ${i.path}` : ''}`)
    }
  }
  return lines.join('\n')
}

export function parseReviewItemsFile(raw: unknown): { items: ReviewItem[]; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = []
  const wrap = raw as { reviewItems?: unknown }
  if (!wrap || !Array.isArray(wrap.reviewItems)) {
    return { items: [], issues: [issue('error', 'REVIEW_SHAPE', 'Expected { reviewItems: ReviewItem[] }')] }
  }
  const items: ReviewItem[] = []
  const ids = new Set<string>()
  for (const row of wrap.reviewItems) {
    const p = reviewItemSchema.safeParse(row)
    if (!p.success) {
      issues.push(issue('error', 'ZOD_REVIEW', p.error.message))
      continue
    }
    if (ids.has(p.data.id)) issues.push(issue('error', 'DUP_REVIEW', `Duplicate review id ${p.data.id}`))
    ids.add(p.data.id)
    items.push(p.data)
  }
  return { items, issues }
}
