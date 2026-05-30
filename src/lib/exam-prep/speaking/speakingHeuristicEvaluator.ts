/**
 * Deterministic rubric scores for Speaking training (no LLM).
 * Output matches `aiSpeakingEvaluationPayloadSchema` → `scoreSpeakingFromAiJson`.
 *
 * **Execution gating** is enforced in `aggregateSpeakingAttempt` (execution 0 → all 0).
 *
 * **Pronunciation:** no separate audio analysis; uses optional STT confidence + typed-input penalty.
 */
import { countWords } from '@/lib/exam-scoring/scoringGuards'
import type { SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import type { AiSpeakingEvaluationPayload } from '@/lib/exam-scoring/aiRubricMapper'
import { extractSpeakingCorrections } from '@/lib/exam-prep/speaking/speakingCorrections'

const STOP = new Set([
  'de',
  'het',
  'een',
  'en',
  'van',
  'voor',
  'met',
  'naar',
  'ook',
  'dat',
  'die',
  'dit',
  'te',
  'in',
  'op',
  'aan',
  'bij',
  'als',
  'maar',
  'om',
  'er',
  'ik',
  'je',
  'u',
  'we',
  'ze',
  'mijn',
  'uw',
  'zijn',
  'haar',
  'niet',
  'wel',
  'veel',
  'wat',
  'hoe',
  'waar',
  'wanneer',
  'graag',
  'heel',
])

const REASON_MARKERS = /\b(omdat|want|daarom|dus|daarnaast)\b/i
const ENGLISH_HINT = /\b(the|and|is|are|because|very|like|when|what|how)\b/i

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zà-ÿ']/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function contentKeywords(text: string): Set<string> {
  const out = new Set<string>()
  for (const w of tokens(text)) {
    if (!STOP.has(w)) out.add(w)
  }
  return out
}

function overlapCount(answer: string, prompt: string, extra: string[] | undefined): number {
  const a = contentKeywords(answer)
  const p = contentKeywords(prompt)
  let n = 0
  for (const w of p) {
    if (a.has(w)) n++
  }
  if (extra) {
    for (const w of extra) {
      if (a.has(w.toLowerCase())) n++
    }
  }
  return n
}

function topicKeywordHits(answer: string, keywords: string[] | undefined): { hits: number; total: number } {
  if (!keywords?.length) return { hits: 0, total: 0 }
  const a = contentKeywords(answer)
  let hits = 0
  for (const w of keywords) {
    if (a.has(w.toLowerCase())) hits += 1
  }
  return { hits, total: keywords.length }
}

function uniqueRatio(answer: string): number {
  const t = tokens(answer)
  if (t.length === 0) return 0
  return new Set(t).size / t.length
}

function sentenceCount(answer: string): number {
  const parts = answer.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)
  return Math.max(1, parts.length)
}

/**
 * Build AI-shaped evaluation payload for `scoreSpeakingFromAiJson`.
 */
export function buildHeuristicSpeakingAiPayload(
  item: SpeakingTrainingItem,
  answer: string,
  opts?: { transcriptConfidence?: number; inputMode?: 'voice' | 'type' }
): AiSpeakingEvaluationPayload {
  const trimmed = answer.trim()
  const wc = countWords(trimmed)
  const overlap = overlapCount(trimmed, item.promptDutch, item.topicKeywords)
  const { hits: topicHits, total: topicTotal } = topicKeywordHits(trimmed, item.topicKeywords)
  const topicRatio = topicTotal > 0 ? topicHits / topicTotal : overlap > 0 ? 0.6 : 0
  const hasReason = REASON_MARKERS.test(trimmed)
  const englishSlip = ENGLISH_HINT.test(trimmed)
  const sentences = sentenceCount(trimmed)
  const uniq = uniqueRatio(trimmed)
  const corrections = extractSpeakingCorrections(trimmed, 3)
  const correctionCount = corrections.length

  let execution = 0
  if (wc >= 2) {
    if (overlap === 0 && wc < 10) execution = 0
    else if (overlap === 0) execution = 1
    else if (item.expectsReason && !hasReason && wc < 12) execution = 1
    else if (item.expectsReason && !hasReason) execution = 2
    else if (overlap >= 1 && wc < 6) execution = 1
    else if (overlap >= 1 && wc < 14) execution = 2
    else execution = 3
  }

  let vocabulary = 0
  if (execution > 0) {
    if (topicTotal > 0) {
      if (topicRatio >= 0.5 && wc >= 8) vocabulary = 2
      else if (topicRatio >= 0.25 && wc >= 5) vocabulary = 1
      else vocabulary = topicRatio > 0 ? 1 : 0
    } else {
      if (wc >= 14 && uniq >= 0.52) vocabulary = 2
      else if (wc >= 6) vocabulary = 1
      else vocabulary = 0
    }
  }

  let grammar = 0
  if (execution > 0) {
    if (englishSlip && correctionCount >= 1) grammar = 0
    else if (englishSlip) grammar = 1
    else if (correctionCount >= 2) grammar = 0
    else if (correctionCount === 1) grammar = 1
    else if (execution >= 2 && wc >= 8) grammar = 2
    else grammar = 1
  }

  let fluency = 0
  if (execution > 0) {
    if (sentences >= 2 && wc >= 8) fluency = 2
    else if (sentences >= 2 && wc >= 5) fluency = 1
    else if (wc >= 6) fluency = 1
    else fluency = 0
  }

  let clearness = 0
  if (execution > 0) {
    if (sentences >= 2 && (hasReason || wc >= 10)) clearness = 1
    else if (hasReason && wc >= 6) clearness = 1
    else if (sentences >= 2) clearness = 1
    else clearness = 0
  }

  let pronunciation = 0
  if (execution > 0) {
    const c = opts?.transcriptConfidence
    if (opts?.inputMode === 'type') {
      pronunciation = clearness === 1 && grammar >= 1 ? 1 : 0
    } else if (c != null && c >= 0.85 && fluency >= 1) pronunciation = 2
    else if (c != null && c >= 0.55) pronunciation = 1
    else pronunciation = 1
  }

  const rationalesNl: Record<string, string> = {
    execution:
      execution === 0
        ? 'Je antwoord is te kort of sluit niet duidelijk aan bij de vraag.'
        : overlap === 0
          ? 'Gebruik woorden uit het onderwerp van de vraag, zodat je antwoord herkenbaar past.'
          : execution <= 1
            ? 'Je raakt de vraag, maar mist een deel van de opdracht (bijv. reden of detail).'
            : item.expectsReason && !hasReason
              ? 'Voeg een korte reden toe met bijvoorbeeld “omdat” of “want”.'
              : 'Je beantwoordt de vraag inhoudelijk goed voor dit niveau.',
    vocabulary:
      vocabulary === 0
        ? 'Woordkeuze is nog erg algemeen of te dun; gebruik meer woorden rond het thema.'
        : vocabulary === 1
          ? 'Basiswoordenschat is oké; voeg een paar concrete woorden toe die bij het onderwerp horen.'
          : 'Je gebruikt passende woorden voor het onderwerp en de lengte van je antwoord.',
    grammar:
      grammar === 0
        ? 'Er vallen meerdere grammaticale of mengvormen (NL/EN) op — zie de correcties.'
        : grammar === 1
          ? 'Globaal begrijpelijk, maar er zijn duidelijke grammaticale aandachtspunten.'
          : 'Zinnen zijn overwegend correct en begrijpelijk op A2-niveau.',
    fluency:
      fluency === 0
        ? 'Het antwoord is erg kort of hapert in stukjes; probeer twee korte zinnen.'
        : fluency === 1
          ? 'Redelijke doorloop; je kunt iets vloeiender met verbindingswoorden en twee zinnen.'
          : 'Je antwoord heeft een duidelijke loop en meerdere zinnen — goed voor het examen.',
    clearness:
      clearness === 0
        ? 'Structuur is zwak: voeg een tweede zin of een verbandwoord toe (omdat, want, daarnaast).'
        : 'Je ideeën zijn goed te volgen voor de beoordelaar.',
    pronunciation:
      opts?.inputMode === 'type'
        ? 'Getypt: uitspraak niet beoordeeld — score conservatief; gebruik de microfoon voor een rijker signaal.'
        : opts?.transcriptConfidence != null
          ? 'Uitspraak deels afgeleid uit spraakherkenning (geen aparte audio-analyse).'
          : 'Uitspraak voorzichtig ingeschat; neem op met de microfoon voor betere inschatting.',
  }

  return {
    scores: {
      execution,
      vocabulary,
      grammar,
      fluency,
      clearness,
      pronunciation,
    },
    rationales: rationalesNl,
    internalReasoning: `heuristic:v2|overlap=${overlap}|wc=${wc}|topic=${topicHits}/${topicTotal}|reason=${hasReason}|en=${englishSlip}|corr=${correctionCount}`,
    certainty: Math.min(0.92, 0.45 + (wc >= 8 ? 0.12 : 0) + (correctionCount === 0 ? 0.08 : 0)),
  }
}
