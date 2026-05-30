/**
 * Normalization + scoring helpers for Session Learning Insight extraction.
 * Read-only transforms — does not mutate report payloads.
 */

import type { Score01 } from './userLearningProfileDocument'

const MAX_KEY_LEN = 120
const MAX_PATTERN_ID_LEN = 64
const MAX_EVIDENCE = 24

/** Stable vocabulary key: lowercase, collapsed whitespace, bounded length. */
export function normalizeWordKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_KEY_LEN)
}

const GRAMMAR_PATTERN_RULES: Array<{ re: RegExp; id: string }> = [
  { re: /preposit|prep(osition)?|naar |van |uit |tegen |tussen |achter |voor |met /i, id: 'grammar_missing_or_weak_preposition' },
  { re: /verb|werkwoord|tense|tijd|pv|perfect|imperfect/i, id: 'grammar_verb_form_or_tense' },
  { re: /word order|woordvolgorde|invers|V2|bijzin|subclause|nevenschikking/i, id: 'grammar_word_order' },
  { re: /question|indirect question|indirecte vraag|vraagzin|WH-question|wie |wat |hoe |waarom /i, id: 'grammar_question_format' },
  { re: /opinion|mening|standpunt|eigenlijk denk|volgens mij framing/i, id: 'grammar_opinion_framing' },
  { re: /article|lidwoord|de |het |een /i, id: 'grammar_article_agreement' },
  { re: /agreement|concord|number|singular|plural|meervoud/i, id: 'grammar_agreement' },
]

/**
 * Reusable pattern id from free-text label (structural issues, not raw spans).
 */
export function normalizePatternId(humanLabel: string): string {
  const label = humanLabel.trim().slice(0, 200)
  if (!label) return 'pat_unspecified'
  for (const { re, id } of GRAMMAR_PATTERN_RULES) {
    if (re.test(label)) return id
  }
  const slug = normalizeWordKey(label).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  const base = `pat_${slug || 'label'}`.slice(0, MAX_PATTERN_ID_LEN)
  return base.length < 8 ? `${base}_x` : base
}

/** Pronunciation target key: normalized word/surface + issue family. */
export function normalizePronunciationTarget(word: string, issueFamily: string): string {
  const w = normalizeWordKey(word).replace(/:/g, '_')
  const fam = normalizeWordKey(issueFamily).replace(/[^a-z0-9_]+/g, '').slice(0, 32) || 'unknown'
  return `${w}:${fam}`.slice(0, MAX_KEY_LEN)
}

/** Dedupe evidence refs / tags while preserving order. */
export function dedupeEvidenceItems(refs: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const r of refs) {
    const t = r.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
    if (out.length >= MAX_EVIDENCE) break
  }
  return out
}

/** Map heterogeneous severity hints to 1–3 (higher = more concern). */
export function mapIssueSeverity(input: {
  numeric?: number | null
  label?: 'high' | 'medium' | 'low' | string | null
  unclear?: boolean
}): number {
  if (typeof input.numeric === 'number' && Number.isFinite(input.numeric)) {
    const n = input.numeric
    if (n <= 1) return 1
    if (n <= 2) return 2
    return Math.min(3, Math.round(n))
  }
  const lab = (input.label ?? '').toString().toLowerCase()
  if (lab === 'high' || input.unclear) return 3
  if (lab === 'medium') return 2
  if (lab === 'low') return 1
  return 2
}

/** Map model / pipeline confidence to 0–1 for insight rows. */
/** Collapse free-text / Azure labels into pronunciation issue families. */
export function mapPronunciationIssueFamily(raw: string | null | undefined): string {
  const s = (raw ?? '').toLowerCase()
  if (/stress|klemtoon/i.test(s)) return 'stress'
  if (/consonant|medeklinker|cluster/i.test(s)) return 'consonant'
  if (/vowel|klinker|tweeklank|ui|eu|ij/i.test(s)) return 'vowel'
  if (/pace|tempo|speed|rhythm|ritme/i.test(s)) return 'pacing'
  if (/clear|helder|mumble|unclear/i.test(s)) return 'clarity'
  return 'unknown'
}

export function mapIssueConfidence(params: {
  level?: 'high' | 'medium' | 'low' | null
  /** When true, pronunciation / pause claims are better grounded. */
  audioBacked?: boolean
  /** Multiplier for transcript-only pronunciation (0–1). */
  transcriptOnlyPenalty?: number
}): Score01 {
  const pen = params.transcriptOnlyPenalty ?? 0.78
  const audio = params.audioBacked ?? false
  const lv = params.level ?? 'medium'
  if (lv === 'high') return audio ? 0.92 : 0.78 * pen
  if (lv === 'medium') return audio ? 0.72 : 0.52 * pen
  if (lv === 'low') return audio ? 0.5 : 0.34 * pen
  return audio ? 0.58 : 0.42 * pen
}
