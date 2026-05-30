/**
 * Bridges lesson completion → review bank + SRS + mastery (Stage 4).
 * Caller runs `extractReviewMaterial` (lesson-engine) to avoid import cycles.
 * Legacy `enqueueReviewForSchemaLesson` remains in `extractAndEnqueueReview`.
 */
import { reviewItemSchema, type ReviewItem } from '@/lib/schemas/reviewItem.schema'
import { createInitialSrsItem } from '@/lib/review-engine/scheduler'
import { ensureMasteryRow, type ReviewPersistencePort } from '@/lib/review-engine/reviewPersistence'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { updateMasteryFromLessonCompletion } from '@/lib/review-engine/mastery'
import { moduleIdFromLessonId, reviewItemIdForGrammar, reviewItemIdForLemma } from '@/lib/review-engine/types'

function upsertById<T extends { id: string }>(rows: T[], row: T): T[] {
  const i = rows.findIndex((r) => r.id === row.id)
  if (i === -1) return [...rows, row]
  const next = [...rows]
  next[i] = row
  return next
}

export type VocabIngestEntry = {
  lemma: string
  /** English translation, when known — produces a precise prompt. */
  translation?: string
  /** Dutch example sentence (lets the session builder generate cloze drills). */
  exampleNl?: string
  /** English translation of the example sentence (used as a meaning-anchor hint). */
  exampleEn?: string
  /** Part of speech, used as a hint label (e.g. "noun", "verb"). */
  partOfSpeech?: string
}

function vocabPrompt(entry: VocabIngestEntry): string {
  const t = entry.translation?.trim()
  if (t) return `Recall the Dutch word for “${t}”.`
  // Prompt must stay UI-agnostic: the renderer picks MCQ / fill-blank at session time.
  return 'Recall the Dutch word from your last lesson.'
}

function buildItemsFromLesson(
  lessonId: string,
  vocab: VocabIngestEntry[],
  grammarLabel?: string
): ReviewItem[] {
  const moduleId = moduleIdFromLessonId(lessonId)
  const items: ReviewItem[] = []
  for (const entry of vocab) {
    const lemma = entry.lemma.trim()
    if (!lemma) continue
    const id = reviewItemIdForLemma(lessonId, lemma)
    const parsed = reviewItemSchema.safeParse({
      id,
      sourceLessonId: lessonId,
      type: 'vocab',
      prompt: vocabPrompt(entry),
      expectedAnswer: lemma,
      difficulty: 'A2_mid',
      tags: ['lemma', 'vocab'],
      metadata: {
        lemma,
        moduleId,
        translation: entry.translation?.trim() || undefined,
        exampleNl: entry.exampleNl?.trim() || undefined,
        exampleEn: entry.exampleEn?.trim() || undefined,
        partOfSpeech: entry.partOfSpeech?.trim() || undefined,
      },
    })
    if (parsed.success) items.push(parsed.data)
  }
  if (grammarLabel) {
    const id = reviewItemIdForGrammar(lessonId)
    const parsed = reviewItemSchema.safeParse({
      id,
      sourceLessonId: lessonId,
      type: 'grammar',
      prompt: `Which option best matches “${grammarLabel}”?`,
      expectedAnswer: grammarLabel,
      difficulty: 'A2_mid',
      tags: ['grammar'],
      metadata: { grammarLabel, moduleId },
    })
    if (parsed.success) items.push(parsed.data)
  }
  return items
}

/** Strip leading/trailing whitespace + punctuation that sneaks in from phrase splits. */
function cleanLemma(raw: string): string {
  return raw
    .replace(/^[\s\p{P}\p{S}]+/u, '')
    .replace(/[\s\p{P}\p{S}]+$/u, '')
    .trim()
    .toLowerCase()
}

function normalizeVocabEntries(input: VocabIngestEntry[] | string[]): VocabIngestEntry[] {
  const out: VocabIngestEntry[] = []
  const seen = new Set<string>()
  for (const raw of input) {
    const entry: VocabIngestEntry =
      typeof raw === 'string'
        ? { lemma: raw }
        : {
            lemma: raw.lemma,
            translation: raw.translation,
            exampleNl: raw.exampleNl,
            exampleEn: raw.exampleEn,
            partOfSpeech: raw.partOfSpeech,
          }
    const lemma = cleanLemma(entry.lemma)
    // Reject lemmas that still contain internal punctuation — those are phrase fragments
    // (e.g. `"zwart, melk"`), not standalone vocabulary, and produce nonsensical drills.
    if (!lemma || /[,;:]/.test(lemma) || seen.has(lemma)) continue
    seen.add(lemma)
    out.push({
      lemma,
      translation: entry.translation?.trim() || undefined,
      exampleNl: entry.exampleNl?.trim() || undefined,
      exampleEn: entry.exampleEn?.trim() || undefined,
      partOfSpeech: entry.partOfSpeech?.trim() || undefined,
    })
  }
  return out
}

export async function ingestLessonReviewMaterial(
  userId: string,
  port: ReviewPersistencePort,
  input: {
    lessonId: string
    /** Accept lemma strings or `{ lemma, translation? }` entries (preferred — produces precise prompts). */
    vocab: VocabIngestEntry[] | string[]
    grammarLabel?: string
  }
): Promise<void> {
  const entries = normalizeVocabEntries(input.vocab)
  const gl = input.grammarLabel?.trim()
  if (entries.length === 0 && !gl) return

  const newItems = buildItemsFromLesson(input.lessonId, entries, gl)
  let bank = await port.loadReviewBank(userId)
  for (const it of newItems) {
    bank = upsertById(bank, it)
  }
  await port.saveReviewBank(userId, bank)

  let srs = await port.loadSrsItems(userId)
  const now = new Date()
  const moduleId = moduleIdFromLessonId(input.lessonId)
  for (const it of newItems) {
    if (!srs.some((s) => s.reviewItemId === it.id)) {
      srs = [...srs, createInitialSrsItem({ userId, reviewItemId: it.id, now, moduleId })]
    }
  }
  await port.saveSrsItems(userId, srs)

  const mastery = await ensureMasteryRow(port, userId)
  const nextMastery = updateMasteryFromLessonCompletion(mastery, {
    lemmas: entries.map((e) => e.lemma),
    grammarLabel: gl,
  })
  await port.saveMastery(userId, nextMastery)
}

/** Fire-and-forget client bridge (lesson player). Accepts lemma strings or rich entries. */
export function ingestLessonReviewMaterialClient(
  lessonId: string,
  vocab: VocabIngestEntry[] | string[],
  grammarLabel?: string
): void {
  if (typeof window === 'undefined') return
  void (async () => {
    const { localReviewPersistence } = await import('@/lib/review-engine/reviewPersistence')
    await ingestLessonReviewMaterial(getRetentionUserId(), localReviewPersistence, {
      lessonId,
      vocab,
      grammarLabel,
    })
  })()
}

