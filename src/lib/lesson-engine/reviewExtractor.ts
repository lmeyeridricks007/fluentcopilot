/**
 * Derives lemmas + grammar label for SRS enqueue from a schema lesson + module catalog.
 */
import type { GrammarTarget } from '@/lib/schemas/grammarTarget.schema'
import type { Lesson } from '@/lib/schemas/lesson.schema'
import type { LessonStep } from '@/lib/schemas/lessonStep.schema'
import type { VocabTarget } from '@/lib/schemas/vocabTarget.schema'
import { enqueueReviewForSchemaLesson } from '@/features/curriculum/a2ReviewStore'
import {
  ingestLessonReviewMaterialClient,
  type VocabIngestEntry,
} from '@/lib/review-engine/integration'

export type ModuleCatalog = {
  grammarTargets: GrammarTarget[]
  vocabTargets: VocabTarget[]
}

function pushVocabEntry(
  out: VocabIngestEntry[],
  seen: Set<string>,
  lemma: string,
  extras?: {
    translation?: string
    exampleNl?: string
    exampleEn?: string
    partOfSpeech?: string
  }
) {
  const key = lemma.trim().toLowerCase()
  if (!key) return
  const existing = seen.has(key) ? out.find((e) => e.lemma === key) : null
  if (!existing) {
    seen.add(key)
    out.push({
      lemma: key,
      translation: extras?.translation?.trim() || undefined,
      exampleNl: extras?.exampleNl?.trim() || undefined,
      exampleEn: extras?.exampleEn?.trim() || undefined,
      partOfSpeech: extras?.partOfSpeech?.trim() || undefined,
    })
    return
  }
  // Fill missing fields if a later reference for the same lemma carries richer data.
  if (!existing.translation && extras?.translation?.trim()) existing.translation = extras.translation.trim()
  if (!existing.exampleNl && extras?.exampleNl?.trim()) existing.exampleNl = extras.exampleNl.trim()
  if (!existing.exampleEn && extras?.exampleEn?.trim()) existing.exampleEn = extras.exampleEn.trim()
  if (!existing.partOfSpeech && extras?.partOfSpeech?.trim())
    existing.partOfSpeech = extras.partOfSpeech.trim()
}

function vocabExtrasFromTarget(v: VocabTarget): {
  translation: string
  exampleNl?: string
  exampleEn?: string
  partOfSpeech?: string
} {
  return {
    translation: v.translation,
    exampleNl: v.example?.nl,
    exampleEn: v.example?.en,
    partOfSpeech: v.partOfSpeech,
  }
}

function vocabEntriesFromLesson(lesson: Lesson, catalog: ModuleCatalog): VocabIngestEntry[] {
  const vocabById = new Map(catalog.vocabTargets.map((v) => [v.id, v]))
  const vocabByLemma = new Map<string, VocabTarget>()
  for (const v of catalog.vocabTargets) {
    const k = v.lemma.trim().toLowerCase()
    if (k && !vocabByLemma.has(k)) vocabByLemma.set(k, v)
  }
  const out: VocabIngestEntry[] = []
  const seen = new Set<string>()
  for (const id of lesson.vocabTargets) {
    const v = vocabById.get(id)
    if (v) pushVocabEntry(out, seen, v.lemma, vocabExtrasFromTarget(v))
  }
  for (const step of lesson.steps) {
    const s = step as LessonStep
    const content = s.content
    if (!content || typeof content !== 'object') continue
    const c = content as Record<string, unknown>
    const lemmas = c.lemmas
    if (Array.isArray(lemmas)) {
      for (const x of lemmas) {
        if (typeof x !== 'string') continue
        const lemma = x.trim().toLowerCase()
        const v = vocabByLemma.get(lemma)
        pushVocabEntry(out, seen, lemma, v ? vocabExtrasFromTarget(v) : undefined)
      }
    }
    if (Array.isArray(c.previewItems)) {
      for (const item of c.previewItems) {
        if (!item || typeof item !== 'object') continue
        const rec = item as {
          lemma?: string
          translationEn?: string
          translation?: string
          exampleNl?: string
          exampleEn?: string
          partOfSpeech?: string
        }
        if (!rec.lemma) continue
        const lemma = rec.lemma.trim().toLowerCase()
        const fallback = vocabByLemma.get(lemma)
        pushVocabEntry(out, seen, lemma, {
          translation: rec.translationEn || rec.translation || fallback?.translation,
          exampleNl: rec.exampleNl || fallback?.example?.nl,
          exampleEn: rec.exampleEn || fallback?.example?.en,
          partOfSpeech: rec.partOfSpeech || fallback?.partOfSpeech,
        })
      }
    }
  }
  return out
}

function grammarLabel(lesson: Lesson, catalog: ModuleCatalog): string | undefined {
  const g = catalog.grammarTargets.find((x) => lesson.grammarTargets.includes(x.id))
  return g?.name
}

/** Pure extraction (testing / preview). */
export function extractReviewMaterial(lesson: Lesson, catalog: ModuleCatalog): {
  lemmas: string[]
  vocabEntries: VocabIngestEntry[]
  grammarLabel?: string
} {
  const vocabEntries = vocabEntriesFromLesson(lesson, catalog)
  return {
    lemmas: vocabEntries.map((e) => e.lemma),
    vocabEntries,
    grammarLabel: grammarLabel(lesson, catalog),
  }
}

/** Side effect: merges into existing A2 review queue (same localStorage contract). */
export function extractAndEnqueueReview(lesson: Lesson, catalog: ModuleCatalog): void {
  const { lemmas, vocabEntries, grammarLabel: gl } = extractReviewMaterial(lesson, catalog)
  enqueueReviewForSchemaLesson(lesson.id, lemmas, gl)
  ingestLessonReviewMaterialClient(lesson.id, vocabEntries, gl)
}
