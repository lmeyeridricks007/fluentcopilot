/**
 * Builds concrete session cards from enriched SRS + review bank rows.
 */
import type { ReviewItem, ReviewItemType } from '@/lib/schemas/reviewItem.schema'
import type { EnrichedDueRow, ReviewCardUiMode, ReviewSessionCard } from '@/lib/review-engine/types'
import { listeningPromptParts } from '@/lib/review-engine/reviewListeningPrompt'
import { mulberry32 } from '@/lib/review-engine/reviewSelector'

function expectedAsString(expected: string | string[]): string {
  return Array.isArray(expected) ? expected[0] : expected
}

function pickDistractors(
  correct: string,
  bank: ReviewItem[],
  count: number,
  rand: () => number
): string[] {
  const cleanCorrect = cleanLemmaSurface(correct).toLowerCase()
  const correctTokenCount = cleanCorrect.split(/\s+/).filter(Boolean).length
  const pool = bank
    .map((b) => (typeof b.expectedAnswer === 'string' ? b.expectedAnswer : b.expectedAnswer[0]))
    .map((x) => cleanLemmaSurface(x ?? ''))
    // Drop empty strings, anything that still has internal punctuation (phrase fragments),
    // and the correct answer itself.
    .filter((x) => x && !/[,;:]/.test(x) && x.toLowerCase() !== cleanCorrect)
  // Prefer distractors with the same word count as the correct answer so a 1-word vocab
  // question is not paired with a multi-word phrase that obviously looks different.
  const sameShape = pool.filter((x) => x.split(/\s+/).filter(Boolean).length === correctTokenCount)
  const primary = [...new Set(sameShape)]
  shuffleWithRand(primary, rand)
  if (primary.length >= count) return primary.slice(0, count)
  // Top up from the rest of the pool if there aren't enough same-shape candidates.
  const rest = [...new Set(pool.filter((x) => !primary.includes(x)))]
  shuffleWithRand(rest, rand)
  return [...primary, ...rest.slice(0, count - primary.length)]
}

function shuffleWithRand<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function uiModeForType(t: ReviewItemType, rand: () => number): ReviewCardUiMode {
  const r = rand()
  if (t === 'kmn') return 'kmn_flash'
  if (t === 'speaking') return 'speaking'
  if (t === 'listening') return 'listening_mcq'
  if (t === 'grammar') return r < 0.55 ? 'mcq' : 'fill_blank'
  if (t === 'phrase') return r < 0.5 ? 'fill_blank' : 'reorder'
  return r < 0.65 ? 'mcq' : 'fill_blank'
}

function phraseTokens(answer: string): string[] {
  return answer.split(/\s+/).filter(Boolean)
}

function shuffledTokensFromPhrase(answer: string, rand: () => number): string[] {
  const copy = phraseTokens(answer)
  if (copy.length < 2) return copy
  // Ensure shuffled order differs from the canonical one so the drill is meaningful.
  for (let attempt = 0; attempt < 4; attempt++) {
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    if (copy.join(' ') !== answer.trim()) return copy
  }
  // Fallback: swap first two tokens so we never present the answer pre-sorted.
  ;[copy[0], copy[1]] = [copy[1], copy[0]]
  return copy
}

function reorderPromptFor(item: ReviewItem): string {
  const base = sanitizePrompt(item.prompt)
  const instruction = 'Put the words in order.'
  if (!base) return instruction
  if (/put the words in order/i.test(base)) return base
  return `${base}\n\n${instruction}`
}

/**
 * Builds a single-token mask that keeps the leading letter visible (e.g. `mees` → `m___`).
 * Pure underscores give zero signal on one-word vocab answers and frustrate the learner.
 */
function maskSingleWord(word: string): { masked: string; changed: boolean } {
  if (!/^[\p{L}\p{Nd}'’-]+$/u.test(word)) return { masked: word, changed: false }
  if (word.length < 2) return { masked: word, changed: false }
  const first = Array.from(word)[0]!
  const tail = Array.from(word).slice(1).length
  return { masked: `${first}${'_'.repeat(tail)}`, changed: true }
}

/**
 * Masks the first 3+ letter/digit run (Unicode-aware). Single-word answers keep the
 * leading letter so learners still have a usable hint instead of bare underscores.
 */
function maskFirstLongToken(answer: string, blank = '____'): { masked: string; changed: boolean } {
  const trimmed = answer.trim()
  if (!trimmed) return { masked: trimmed, changed: false }
  const tokens = trimmed.split(/\s+/).filter(Boolean)
  if (tokens.length === 1) return maskSingleWord(tokens[0]!)
  const re = /[\p{L}\p{Nd}]{3,}/u
  const m = re.exec(trimmed)
  if (!m) return { masked: trimmed, changed: false }
  const out = `${trimmed.slice(0, m.index)}${blank}${trimmed.slice(m.index + m[0].length)}`
  return { masked: out, changed: true }
}

/**
 * Strips UI-coupled phrases from legacy SRS prompts cached in storage so the heading
 * does not promise an MCQ when the renderer is showing a fill-blank input. Also cleans
 * up double spaces and dangling spaces before punctuation (`word .` → `word.`).
 */
function sanitizePrompt(prompt: string): string {
  return prompt
    .replace(/\s*\(tap the best match\)\s*\.?/gi, '')
    .replace(/\s*\(choose the best match\)\s*\.?/gi, '')
    .replace(/\s*\(pick the best option\)\s*\.?/gi, '')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Strip leading/trailing punctuation that sneaks into lemmas extracted from phrases. */
function cleanLemmaSurface(raw: string): string {
  return raw
    .replace(/^[\s\p{P}\p{S}]+/u, '')
    .replace(/[\s\p{P}\p{S}]+$/u, '')
    .trim()
}

type VocabMetadata = {
  translation?: string
  exampleNl?: string
  exampleEn?: string
  partOfSpeech?: string
  lemma?: string
}

function readVocabMetadata(item: ReviewItem): VocabMetadata {
  if (typeof item.metadata !== 'object' || !item.metadata) return {}
  const m = item.metadata as VocabMetadata
  return {
    translation: m.translation?.trim() || undefined,
    exampleNl: m.exampleNl?.trim() || undefined,
    exampleEn: m.exampleEn?.trim() || undefined,
    partOfSpeech: m.partOfSpeech?.trim() || undefined,
    lemma: m.lemma?.trim() || undefined,
  }
}

/**
 * Replace the first whole-word occurrence of `lemma` in `sentence` with `____`.
 * Returns `null` when the lemma isn't actually present so the caller can fall back
 * to a non-cloze drill instead of asking about a word that doesn't appear.
 */
function buildClozeFromExample(sentence: string, lemma: string): string | null {
  const cleanLemma = lemma.trim()
  if (!cleanLemma) return null
  const escaped = cleanLemma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(^|[^\\p{L}\\p{Nd}])${escaped}([^\\p{L}\\p{Nd}]|$)`, 'iu')
  const m = re.exec(sentence)
  if (!m) return null
  const start = m.index + m[1].length
  return `${sentence.slice(0, start)}____${sentence.slice(start + cleanLemma.length)}`
}

function buildFillBlankDisplayPrompt(item: ReviewItem, correct: string): string {
  const { masked, changed } = maskFirstLongToken(correct)
  const instruction = sanitizePrompt(item.prompt)
  if (changed && masked.length > 0) {
    return instruction ? `${instruction}\n\n${masked}` : masked
  }
  if (instruction) {
    return instruction.toLowerCase().startsWith('complete:') ? instruction : `Complete: ${instruction}`
  }
  const words = correct.trim().split(/\s+/).filter(Boolean)
  if (words.length > 0) {
    return `Write the Dutch phrase (${words.length} word${words.length > 1 ? 's' : ''}).`
  }
  return 'Write the Dutch answer for this review card.'
}

export function buildCardsFromRows(
  rows: EnrichedDueRow[],
  fullBank: ReviewItem[],
  seed: number = 1
): ReviewSessionCard[] {
  const rand = mulberry32(seed)
  return rows
    .map((row, idx): ReviewSessionCard | null => {
      const { item, srs } = row
      const correct = cleanLemmaSurface(expectedAsString(item.expectedAnswer))
      // Drop SRS rows whose expected answer is now empty (the lemma was just punctuation).
      if (!correct) return null
      const vocabMeta = readVocabMetadata(item)
      const translation = vocabMeta.translation
      const exampleNl = vocabMeta.exampleNl
      const exampleEn = vocabMeta.exampleEn
      const partOfSpeech = vocabMeta.partOfSpeech
      const grammarKey =
        typeof item.metadata === 'object' && item.metadata && 'grammarLabel' in item.metadata
          ? String((item.metadata as { grammarLabel?: string }).grammarLabel)
          : undefined
      const kmnExampleNl =
        typeof item.metadata === 'object' && item.metadata && 'kmnExampleNl' in item.metadata
          ? String((item.metadata as { kmnExampleNl?: string }).kmnExampleNl)
          : undefined

      let uiMode = uiModeForType(item.type, rand)
      // A reorder card with fewer than 2 tokens is unsolvable — fall back to a typed answer.
      if (uiMode === 'reorder' && phraseTokens(correct).length < 2) {
        uiMode = 'fill_blank'
      }
      // Vocab without ANY meaning context (no translation, no example) became a frustrating
      // letter-guess for the learner — drop those legacy rows from the session entirely.
      if (item.type === 'vocab' && !translation && !exampleNl) return null
      // Vocab MCQ without a known English translation devolves into "guess which Dutch word
      // I'm thinking of" — drop to fill-blank where the masked lemma at least gives a usable hint.
      if (item.type === 'vocab' && uiMode === 'mcq' && !translation) {
        uiMode = 'fill_blank'
      }
      // Prefer cloze drills when we have a usable example sentence — completing a real
      // sentence is far more useful than guessing a word in isolation.
      let clozePrompt: string | null = null
      if (item.type === 'vocab' && (uiMode === 'fill_blank' || uiMode === 'mcq') && exampleNl) {
        clozePrompt = buildClozeFromExample(exampleNl, correct)
        if (clozePrompt) uiMode = 'fill_blank'
      }

      const instanceId = `${srs.id}::${idx}`
      const base: Omit<
        ReviewSessionCard,
        'options' | 'tokens' | 'uiMode' | 'prompt' | 'kmnExampleNl'
      > = {
        instanceId,
        srsItemId: srs.id,
        reviewItemId: item.id,
        sourceLessonId: item.sourceLessonId,
        itemType: item.type,
        correctAnswer: item.expectedAnswer,
        lemmaKey: vocabMeta.lemma,
        grammarKey,
        translation,
        exampleNl,
        exampleEn,
        partOfSpeech,
      }

      if (uiMode === 'kmn_flash') {
        return {
          ...base,
          uiMode: 'kmn_flash',
          prompt: sanitizePrompt(item.prompt) || item.prompt,
          correctAnswer: item.expectedAnswer,
          kmnExampleNl: kmnExampleNl?.trim() || undefined,
        }
      }

      if (uiMode === 'reorder') {
        return {
          ...base,
          uiMode,
          prompt: reorderPromptFor(item),
          tokens: shuffledTokensFromPhrase(correct, rand),
          correctAnswer: correct,
        }
      }

      if (uiMode === 'fill_blank') {
        const prompt = clozePrompt
          ? `Complete the sentence:\n\n${clozePrompt}`
          : buildFillBlankDisplayPrompt(item, correct)
        return {
          ...base,
          uiMode,
          prompt,
          correctAnswer: correct,
          isCloze: !!clozePrompt,
        }
      }

      if (uiMode === 'speaking') {
        return {
          ...base,
          uiMode,
          prompt: sanitizePrompt(item.prompt) || item.prompt,
          correctAnswer: correct,
        }
      }

      if (uiMode === 'listening_mcq') {
        const distractors = pickDistractors(correct, fullBank, 3, rand)
        const options = shuffleWithRandReturn([correct, ...distractors], rand)
        const { listeningTextNl, displayPrompt } = listeningPromptParts(item)
        return {
          ...base,
          uiMode,
          prompt: displayPrompt,
          listeningTextNl,
          options,
          correctAnswer: correct,
        }
      }

      /* mcq default */
      const distractors = pickDistractors(correct, fullBank, 3, rand)
      const options = shuffleWithRandReturn([correct, ...distractors], rand)
      return {
        ...base,
        uiMode: 'mcq',
        prompt: sanitizePrompt(item.prompt) || item.prompt,
        options,
        correctAnswer: correct,
      }
    })
    .filter((card): card is ReviewSessionCard => card !== null)
}

function shuffleWithRandReturn<T>(arr: T[], rand: () => number): T[] {
  const copy = [...arr]
  shuffleWithRand(copy, rand)
  return copy
}
