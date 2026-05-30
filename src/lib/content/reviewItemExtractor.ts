/**
 * Deterministic extraction of `ReviewItem` rows from authored lessons + module catalogs.
 * Aligns with Stage 4 review engine (`reviewItem.schema`, `ingestLessonReviewMaterial` patterns).
 */
import type { CourseModule } from '@/lib/schemas/module.schema'
import type { Lesson } from '@/lib/schemas/lesson.schema'
import type { LessonStep } from '@/lib/schemas/lessonStep.schema'
import { reviewItemSchema, type ReviewItem } from '@/lib/schemas/reviewItem.schema'

export function reviewItemIdVocab(lessonId: string, vocabTargetId: string): string {
  return `rev-${lessonId}-vt-${vocabTargetId}`.replace(/\s+/g, '-')
}

export function reviewItemIdGrammar(lessonId: string, grammarTargetId: string): string {
  return `rev-${lessonId}-gt-${grammarTargetId}`.replace(/\s+/g, '-')
}

export function reviewItemIdPhrase(lessonId: string, slug: string): string {
  return `rev-${lessonId}-ph-${slug}`.replace(/\s+/g, '-').slice(0, 120)
}

function slugFromNl(nl: string): string {
  return nl
    .toLowerCase()
    .replace(/[^a-z0-9äöüéèêëàáâåœæß]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'phrase'
}

export function extractReviewItemsFromLesson(lesson: Lesson, module: CourseModule): ReviewItem[] {
  const grammarById = new Map(module.grammarTargets.map((g) => [g.id, g]))
  const vocabById = new Map(module.vocabTargets.map((v) => [v.id, v]))
  const out: ReviewItem[] = []
  const seen = new Set<string>()

  for (const vid of lesson.vocabTargets) {
    const v = vocabById.get(vid)
    if (!v) continue
    const id = reviewItemIdVocab(lesson.id, vid)
    if (seen.has(id)) continue
    seen.add(id)
    const row = {
      id,
      sourceLessonId: lesson.id,
      type: 'vocab' as const,
      prompt: `Recall the Dutch word for “${v.translation}”.`,
      expectedAnswer: v.lemma,
      variants: v.word !== v.lemma ? [v.word] : undefined,
      difficulty: 'A2_mid' as const,
      tags: [...(v.tags ?? []), 'vocab', module.id],
      metadata: { vocabTargetId: vid, moduleId: module.id, lemma: v.lemma },
    }
    const p = reviewItemSchema.safeParse(row)
    if (p.success) out.push(p.data)
  }

  for (const gid of lesson.grammarTargets) {
    const g = grammarById.get(gid)
    if (!g) continue
    const id = reviewItemIdGrammar(lesson.id, gid)
    if (seen.has(id)) continue
    seen.add(id)
    const ex = g.examples[0]
    const row = {
      id,
      sourceLessonId: lesson.id,
      type: 'grammar' as const,
      prompt: `Which option best fits the pattern: “${g.name}”?`,
      expectedAnswer: ex?.nl ?? g.name,
      difficulty: 'A2_mid' as const,
      tags: ['grammar', module.id],
      metadata: { grammarTargetId: gid, moduleId: module.id, grammarLabel: g.name },
    }
    const p = reviewItemSchema.safeParse(row)
    if (p.success) out.push(p.data)
  }

  for (const step of lesson.steps) {
    const s = step as LessonStep
    if (s.type !== 'discovery') continue
    const phrases = (s.content as { phrases?: { nl: string; en?: string }[] } | undefined)?.phrases
    if (!Array.isArray(phrases)) continue
    for (const ph of phrases) {
      if (!ph?.nl) continue
      const slug = slugFromNl(ph.nl)
      const id = reviewItemIdPhrase(lesson.id, slug)
      if (seen.has(id)) continue
      seen.add(id)
      const row = {
        id,
        sourceLessonId: lesson.id,
        type: 'phrase' as const,
        prompt: ph.en ? `Say in Dutch (meaning: ${ph.en}).` : `Produce the Dutch phrase.`,
        expectedAnswer: ph.nl,
        difficulty: 'A2_mid' as const,
        tags: ['phrase', module.id],
        metadata: { moduleId: module.id, phraseNl: ph.nl },
      }
      const p = reviewItemSchema.safeParse(row)
      if (p.success) out.push(p.data)
    }
  }

  return out
}

export function extractReviewItemsFromModule(module: CourseModule): ReviewItem[] {
  const all: ReviewItem[] = []
  const seen = new Set<string>()
  for (const lesson of module.lessons) {
    for (const item of extractReviewItemsFromLesson(lesson, module)) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      all.push(item)
    }
  }
  return all
}

export function suggestedReviewItemRefsForLesson(lesson: Lesson, module: CourseModule): string[] {
  return extractReviewItemsFromLesson(lesson, module).map((r) => r.id)
}
