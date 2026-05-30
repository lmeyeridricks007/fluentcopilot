import { parseSpeakLiveState } from '../../domain/speakLive/speakLiveFsm'
import type { LanguageCoachNudgeEvent } from '../../domain/speakLive/languageCoachSessionTypes'
import { normalizeSpeakLiveCefrLevel } from '../../domain/speakLive/speakLiveSupportStrategy'
import type { ConversationMessage, ScenarioConfig } from '../../models/contracts'
import type {
  EvidenceSummary,
  LiveSessionEvaluation,
  RecommendedFollowUp,
  ScoredDimension,
  SessionEvaluationInsights,
  TaskOutcome,
} from '../speak-live/liveVoiceEvaluationTypes'
import { computeLanguageCoachSessionHandoff } from './languageCoachSessionHandoff'
import { buildLanguageCoachNextPracticePlan } from './languageCoachNextPracticePlanner'
import { aggregateLanguageCoachWeaknessSignals } from './languageCoachSignalAggregation'
import { extractImplicitRecastPairsFromTranscript } from './languageCoachImplicitRecastPairs'
import {
  enrichVoiceWordSemantics,
  type LanguageCoachVoiceWordSemanticInput,
} from './languageCoachVoiceWordSemanticEnricher'
import { getConversationRoleProfile, roleReportFramingLine } from './languageCoachConversationRoles'
import {
  buildCoachLearningInsights,
  buildRoleSaveablePracticeItems,
  howGuidedFallbackNl,
  roleCoachSummaryPrefixNl,
  roleFollowUpSuggestionsNl,
  roleFocusWhyNl,
  roleSavePracticePromptsNl,
  roleSessionEmphasisNl,
  roleRecommendedFollowUps,
} from './languageCoachSessionReportRole'
import { getAzureSpeechLocale, isAzurePronunciationConfigured } from '../speech/pronunciationAssessmentConfig'
import { LEARNER_JUNK_PRONUNCIATION_CAVEAT } from '../speech/azurePronunciationAssessmentService'
import { prepareLiveTurnVoicePrep } from '../speak-live/liveTurnVoicePrepService'
import type { LiveTurnVoicePrepV1 } from '../speak-live/liveTurnVoicePrepService'
import { tryDownloadConversationBinaryArtifact } from '../storage/blobStorageService'

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Map internal Language Coach weakness tags (`follow_up_gap`, `wrong_word_choice`, …) onto
 * learner-facing English descriptions. The tags come from `detectLanguageCoachWeaknessSignals`
 * in `languageCoachWeaknessSignals.ts` and are debug taxonomy, not UI copy. Without this map,
 * `topWeakPatterns` would emit strings like `"follow up gap (×3)"` which then leaked
 * unchanged into:
 *   - the COACH IN ONE LINE headline (“Your main growth area: follow up gap.”)
 *   - the `focusAreaLabel` chip,
 *   - the BEYOND THIS SESSION ribbon sessionEcho (“You were working through follow up gap.”),
 *   - the TRY NEXT line (“Build on today: follow up gap. …”),
 *   - and `scenarioOutcome.whatToImproveNext`.
 *
 * Every tag here is keyed off real heuristics in `languageCoachWeaknessSignals.ts`. Adding a
 * new tag there without a humanized label here falls back to a cleaned `tag.replace(/_/g, ' ')`
 * (still readable), so a missing entry degrades gracefully rather than silently shipping debug
 * taxonomy to learners.
 */
const WEAKNESS_TAG_HUMAN_LABELS: Record<string, string> = {
  follow_up_gap: 'asking follow-up questions',
  past_tense: 'past-tense forms',
  word_order: 'Dutch word order',
  article: 'de / het articles',
  question_form: 'Dutch question forms',
  wrong_word_choice: 'word choice that fits the tone',
  english_fallback: 'staying in Dutch when stuck',
  short_fragments: 'building fuller sentences',
  low_clarity: 'clearer sentence structure',
  grammar_combo: 'grammar (a few small slips combined)',
  hesitation: 'smoother delivery (fewer fillers)',
  simple_repeat: 'varying your sentence patterns',
}

export function humanizeLanguageCoachWeaknessTag(tag: string): string {
  const normalized = tag.trim().toLowerCase()
  return WEAKNESS_TAG_HUMAN_LABELS[normalized] ?? normalized.replace(/_/g, ' ')
}

/**
 * Return weakness patterns as **learner-facing labels**, sorted by frequency, with no debug
 * count suffix. Internal frequency ordering is preserved (highest hits first) — consumers that
 * need raw counts can read `weaknessHits` directly from the persisted blob.
 *
 * Exported only for tests; production code calls this via the evaluator inside this module.
 */
export function topWeakPatterns(hits: Record<string, number>, max: number): string[] {
  return Object.entries(hits)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => humanizeLanguageCoachWeaknessTag(k))
}

function resolveReportedLearnerLevel(messages: ConversationMessage[], fallback: string): string {
  for (const m of [...messages].reverse()) {
    if (m.sender !== 'user') continue
    const raw = m.metadata && typeof m.metadata === 'object' ? (m.metadata.learnerLevelCefr as unknown) : null
    if (typeof raw === 'string' && /^(A1|A2|B1|B2)$/i.test(raw.trim())) {
      return normalizeSpeakLiveCefrLevel(raw.trim().toUpperCase())
    }
  }
  return normalizeSpeakLiveCefrLevel(fallback)
}

function computeSessionDurationSeconds(messages: ConversationMessage[]): number {
  if (messages.length < 2) return 0
  const stamps = messages
    .map((m) => Date.parse(typeof m.createdAt === 'string' ? m.createdAt : ''))
    .filter((ts) => Number.isFinite(ts))
  if (stamps.length < 2) return 0
  const start = Math.min(...stamps)
  const end = Math.max(...stamps)
  return Math.max(0, Math.round((end - start) / 1000))
}

/** User turns that have a persisted learner clip path (same field the live-eval orchestrator reads). */
function countUserTurnsWithLearnerAudioBlob(messages: ConversationMessage[]): number {
  let n = 0
  for (const m of messages) {
    if (m.sender !== 'user') continue
    const meta = m.metadata && typeof m.metadata === 'object' ? (m.metadata as Record<string, unknown>) : null
    const p = meta?.learnerAudioBlobPath
    if (typeof p === 'string' && p.trim().length > 0) n += 1
  }
  return n
}

function deriveObservedCoachLevel(params: {
  practicedLevel: string
  userTurnCount: number
  sessionSignals: Record<string, number>
  weaknessHits: Record<string, number>
}): { observedLevel: string; note: string } | null {
  const practiced = normalizeSpeakLiveCefrLevel(params.practicedLevel)
  const sig = params.sessionSignals
  const weak = params.weaknessHits
  const clean = sig.clean_natural_turn ?? 0
  const fluent = sig.fluent_stretch_turn ?? 0
  const grammar = sig.grammar_instability ?? 0
  const followUp = sig.weak_follow_up ?? 0
  const lowInitiative = sig.low_initiative ?? 0
  const englishFallback = weak.english_fallback ?? 0
  const shortFragments = weak.short_fragments ?? 0

  if (
    practiced === 'A2' &&
    params.userTurnCount >= 5 &&
    (clean >= 3 || fluent >= 2) &&
    grammar <= 1 &&
    followUp <= 1 &&
    lowInitiative <= 1 &&
    englishFallback === 0 &&
    shortFragments <= 1
  ) {
    return {
      observedLevel: 'B1',
      note:
        'You practiced at A2, but this session included several longer and relatively clean responses that sounded closer to B1. The session target stays A2; this is just an evidence-based observation about how your Dutch came across today.',
    }
  }

  if (
    practiced === 'A1' &&
    params.userTurnCount >= 4 &&
    (clean >= 2 || fluent >= 1) &&
    grammar <= 2 &&
    englishFallback <= 1
  ) {
    return {
      observedLevel: 'A2',
      note:
        'You practiced at A1, but parts of this session sounded closer to A2 because you produced a few longer and cleaner Dutch responses. The session target still stays A1; this note only reflects how your output came across in this run.',
    }
  }

  return null
}

/**
 * Phrases the coach prompts use to introduce a corrected/model Dutch line. See
 * `languageCoachCoachGuidePrompt.ts` and `languageCoachNudgeEngine.ts` for the system prompts
 * that bias the model toward these shapes. Order matters: longer/more specific markers come
 * first so "Je bedoelt vast" wins over the generic "Je bedoelt".
 */
const COACH_CORRECTION_INTRO_MARKERS: readonly string[] = [
  'Je bedoelt vast',
  'Je bedoelt waarschijnlijk',
  'Je bedoelt',
  'Een betere zin is',
  'Een betere zin',
  'Beter is',
  'Beter',
  'In het Nederlands zeg je',
  'In het Nederlands',
  'Probeer eens',
  'Probeer',
  'Liever',
  'Je kunt ook zeggen',
  'Je kunt zeggen',
  'Zeg precies',
  'Nog eens',
  'Herhaal precies',
  'Herhaal',
]

/**
 * Quote-pair shapes the model emits for corrected lines: straight ASCII, smart curly, and
 * Dutch-style guillemets. Each pair is matched independently so we don't accept mixed-quote
 * spans that span unrelated phrases.
 */
const COACH_CORRECTION_QUOTE_PAIRS: ReadonlyArray<{ open: string; close: string }> = [
  { open: '"', close: '"' },
  { open: "'", close: "'" },
  { open: '“', close: '”' },
  { open: '‘', close: '’' },
  { open: '«', close: '»' },
]

const COACH_BETTER_LINE_MAX = 240
const COACH_BETTER_LINE_MIN = 4

function escapeForRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Pull the corrected/model Dutch sentence out of a coach reply, ignoring the surrounding
 * validation prose and follow-up questions. Returns `null` when no clean correction can be
 * isolated — callers MUST drop the pair rather than fall back to the whole reply, because
 * dumping multi-sentence coach prose into the "AIM FOR THIS DUTCH" card reads as a verbose
 * conversational response, not a practice target (the 2026-05-16 regression).
 *
 * Strategy:
 *   1. Look for an explicit "intro marker → quoted span" (e.g. `Je bedoelt vast: 'Het was…'`).
 *   2. Fall back to the longest quoted Dutch span anywhere in the reply (still implies the
 *      model marked it as a model line).
 *   3. Return null otherwise. We intentionally do NOT fall back to the first sentence,
 *      because validation lines like "Goed dat je dat zegt!" would slip through.
 *
 * Exported for tests; production callers use `buildImprovedPhrasingExamples` below.
 */
export function pickBetterLineFromCoachReply(coachReply: string): string | null {
  const compact = coachReply.replace(/\s+/g, ' ').trim()
  if (!compact) return null

  for (const marker of COACH_CORRECTION_INTRO_MARKERS) {
    const escMarker = escapeForRegex(marker)
    for (const { open, close } of COACH_CORRECTION_QUOTE_PAIRS) {
      const escOpen = escapeForRegex(open)
      const escClose = escapeForRegex(close)
      /**
       * `[^${escOpen}${escClose}]{0,40}` allows a short bridge like `: ` or ` — ` between the
       * marker and the quoted span, but caps it so we don't accidentally jump past unrelated
       * intervening prose into a later quote.
       */
      const re = new RegExp(
        `${escMarker}[^${escOpen}${escClose}]{0,40}${escOpen}([^${escClose}]{${COACH_BETTER_LINE_MIN},${COACH_BETTER_LINE_MAX}})${escClose}`,
        'i',
      )
      const match = compact.match(re)
      const target = match?.[1]?.trim()
      if (target && target.length >= COACH_BETTER_LINE_MIN) return target
    }
  }

  /**
   * No marker hit. Try the longest quoted span as a softer signal — the model rarely quotes
   * the learner's own text, so a stand-alone quoted Dutch phrase is usually the correction.
   */
  const allQuoted: string[] = []
  for (const { open, close } of COACH_CORRECTION_QUOTE_PAIRS) {
    const escOpen = escapeForRegex(open)
    const escClose = escapeForRegex(close)
    const re = new RegExp(
      `${escOpen}([^${escClose}]{${COACH_BETTER_LINE_MIN},${COACH_BETTER_LINE_MAX}})${escClose}`,
      'g',
    )
    let m: RegExpExecArray | null
    while ((m = re.exec(compact)) !== null) {
      const q = m[1]?.trim()
      if (q && q.length >= COACH_BETTER_LINE_MIN) allQuoted.push(q)
    }
  }
  if (allQuoted.length) {
    allQuoted.sort((a, b) => b.length - a.length)
    return allQuoted[0]!
  }

  return null
}

/**
 * Phrasing cards must quote the learner verbatim from this session (transcript or logged nudge text).
 * Never inject canned “you said” lines — those read as false quotes.
 */
function buildImprovedPhrasingExamples(
  userTexts: string[],
  nudgeEvents: LanguageCoachNudgeEvent[] | null | undefined,
  messages: ConversationMessage[] = [],
): Array<{ learnerish: string; better: string }> {
  const out: Array<{ learnerish: string; better: string }> = []
  const seen = new Set<string>()
  const push = (learnerish: string, better: string) => {
    const lo = learnerish.trim()
    const bt = better.trim()
    if (lo.length < 3 || bt.length < 3) return
    const k = `${lo.slice(0, 120)}|${bt.slice(0, 120)}`
    if (seen.has(k) || out.length >= 4) return
    seen.add(k)
    out.push({ learnerish: lo.slice(0, 260), better: bt.slice(0, 360) })
  }

  // 1) Logged coach moments — learnerOriginal is the actual user line that triggered the nudge.
  //    Only surface pairs where we can isolate a clean corrected Dutch line from the coach
  //    reply (see `pickBetterLineFromCoachReply`). If extraction returns null, the coach reply
  //    was conversational prose with no quoted correction — dumping that into the card reads
  //    as "Goed dat je zegt dat het leuk was! Je bedoelt vast: '…' Wat vonden jullie…",
  //    which is a coach response, not a practice target.
  const events = [...(nudgeEvents ?? [])].filter((e) => e.learnerOriginal?.trim() && e.coachResponse?.trim())
  for (const e of events.slice(-12).reverse()) {
    const better = pickBetterLineFromCoachReply(e.coachResponse)
    if (better) push(e.learnerOriginal, better)
    if (out.length >= 4) return out.slice(0, 4)
  }

  // 2) Transcript scan — pair learner slips with the coach's NEXT-TURN implicit recast.
  //    Many recasts are natural rephrasings without quoted spans, so `pickBetterLineFromCoachReply`
  //    misses them. `extractImplicitRecastPairsFromTranscript` gates on (a) a detected slip
  //    OR (b) coach-reply evidence (perfectum participle / correction marker) before pairing,
  //    and requires ≥30% token change to avoid surfacing pure echo. This is the path that
  //    catches "Gisteren ik gaan naar de winkel." → "Dus gisteren ben je naar de winkel gegaan."
  //    in sessions where no explicit nudgeEvent was logged.
  if (messages.length) {
    for (const pair of extractImplicitRecastPairsFromTranscript(messages, 6)) {
      push(pair.learnerish, pair.better)
      if (out.length >= 4) return out.slice(0, 4)
    }
  }

  // 3) Heuristic upgrades only when the learner’s real text matches (still transcript-backed).
  for (const raw of [...userTexts].reverse()) {
    const t = raw.trim()
    if (t.length < 4 || t.length > 200) continue
    const low = t.toLowerCase()
    if (/no understand|not understand|don't understand|i no understand|i don't understand/.test(low)) {
      push(t.slice(0, 160), 'Ik begrijp het (nog) niet helemaal.')
    } else if (/\b(i|my)\s+(go|went)\b/i.test(t) && /yesterday|gisteren/.test(low)) {
      push(t.slice(0, 160), 'Ik ben gisteren naar … gegaan.')
    } else if (/^\s*i\s+go\s+/i.test(t) || /\bgo gisteren\b/i.test(low)) {
      push(t.slice(0, 160), 'Ik ben gisteren … gegaan.')
    }
    if (out.length >= 4) break
  }

  return out.slice(0, 4)
}

export type LanguageCoachVoiceWordCompareItem = {
  id: string
  weakWord: string
  yourLine: string
  modelDutch: string
  tip?: string
  /**
   * LLM-inferred intent when the spoken weak word is most likely a mistranscription /
   * wrong-word attempt rather than a real Dutch word (e.g. spoken "gernen" → intent
   * "gerend"). Present only when the LLM enricher returned a confident pair; the UI
   * surfaces this as the focus chip + practice target instead of echoing the misheard
   * token back to the learner.
   */
  intent?: {
    dutchWord: string
    englishGloss: string
  }
}

type LanguageCoachVoiceAggregate = {
  assessedTurns: number
  turnsDownloadedOk: number
  avg: { pronunciation: number; clarity: number; rhythm: number; fluency: number } | null
  /** Short learner-facing snippets from pronunciation assessment + timing cues. */
  sampleFindings: string[]
  /** Weak syllables from scored clips, paired with coach / phrasing model Dutch when we can infer it. */
  voiceWordCompareItems: LanguageCoachVoiceWordCompareItem[]
}

function pickLearnerVoiceTipLine(prep: LiveTurnVoicePrepV1): string | null {
  const fromAudio = prep.audioFindings.map((x) => (x ?? '').trim()).find((t) => t.length > 0)
  if (fromAudio) return fromAudio
  for (const c of prep.caveats) {
    const t = (c ?? '').trim()
    if (!t) continue
    if (t === LEARNER_JUNK_PRONUNCIATION_CAVEAT) continue
    if (/reference text is the transcript/i.test(t)) continue
    return t
  }
  return null
}

function resolveModelDutchForWeakWord(
  word: string,
  yourLine: string,
  pairs: Array<{ learnerish: string; better: string }>,
  nudges: LanguageCoachNudgeEvent[] | null | undefined,
): string {
  const lw = word.toLowerCase()
  for (const p of pairs) {
    if (p.learnerish.toLowerCase().includes(lw)) return p.better
  }
  const lineLow = yourLine.toLowerCase()
  for (const e of [...(nudges ?? [])].reverse()) {
    const lo = (e.learnerOriginal ?? '').trim()
    if (lo.length < 3) continue
    if (lineLow.includes(lo.toLowerCase())) {
      const b = pickBetterLineFromCoachReply(e.coachResponse)
      if (b) return b
    }
  }
  const clip = yourLine.length > 160 ? `${yourLine.slice(0, 160)}…` : yourLine
  return `Say this line again with a clearer “${word}”: “${clip}”`
}

/**
 * Detect a row whose `modelDutch` field is the deterministic "say it more clearly" fallback
 * (vs. a real coach correction). We key off the marker phrase that the resolver appends
 * verbatim — keeping the check inline so any future template change in the resolver gets
 * flagged here at the call site.
 */
function isDeterministicEchoFallback(modelDutch: string): boolean {
  return /Say this line again with a clearer/i.test(modelDutch)
}

/**
 * Per-item rewrite of a voice-compare row using the LLM enrichment result. Pure function:
 * does NOT mutate `row` directly; returns the merged row. Behaviour:
 *
 *   - If the LLM produced no suggestion for this row, return the row unchanged (the
 *     deterministic fallback continues to render).
 *   - If `isLikelyDutchWord === true` and we have a `correctedSentence`, replace the
 *     echo `modelDutch` with the LLM's cleaner version but keep the original `weakWord`
 *     chip (the spoken word IS Dutch, just unclear).
 *   - If `isLikelyDutchWord === false` and we have a `likelyIntent`, swap the row over
 *     to the inferred Dutch word: chip becomes the new word, modelDutch becomes the
 *     corrected sentence, tip explains the intent. The original misheard token is kept
 *     in a humanised tip ("Heard as 'gernen' — likely 'gerend'") so the learner sees the
 *     diagnosis, not just the fix.
 *   - In all other cases, return the row unchanged.
 */
function mergeVoiceWordSuggestion(
  row: LanguageCoachVoiceWordCompareItem,
  suggestion:
    | {
        isLikelyDutchWord: boolean
        likelyIntent: { dutchWord: string; englishGloss: string } | null
        correctedSentence: string | null
        pronunciationTip: string | null
      }
    | undefined,
): LanguageCoachVoiceWordCompareItem {
  if (!suggestion) return row
  if (suggestion.isLikelyDutchWord) {
    if (!suggestion.correctedSentence) return row
    return {
      ...row,
      modelDutch: suggestion.correctedSentence,
      ...(suggestion.pronunciationTip ? { tip: suggestion.pronunciationTip } : {}),
    }
  }
  /**
   * Drop the entire enrichment when EITHER half is missing: a `likelyIntent` chip without
   * a clean `correctedSentence` would orphan the diagnosis ("Heard as X — likely Y") on a
   * row whose AIM-FOR-THIS-DUTCH still shows the deterministic echo. Validation in
   * `parseSuggestions` nulls out `correctedSentence` whenever it would be nonsensical
   * (duplicates, missing intent word), so this branch is the safety net that prevents a
   * half-applied enrichment from shipping. Falls back to the original deterministic row.
   */
  if (!suggestion.likelyIntent || !suggestion.correctedSentence) return row
  const inferredTip = (() => {
    const lead = `Heard as “${row.weakWord}” — likely “${suggestion.likelyIntent.dutchWord}”${
      suggestion.likelyIntent.englishGloss ? ` (${suggestion.likelyIntent.englishGloss})` : ''
    }.`
    if (suggestion.pronunciationTip) return `${lead} ${suggestion.pronunciationTip}`
    return lead
  })()
  return {
    ...row,
    weakWord: suggestion.likelyIntent.dutchWord,
    modelDutch: suggestion.correctedSentence,
    tip: inferredTip,
    intent: {
      dutchWord: suggestion.likelyIntent.dutchWord,
      englishGloss: suggestion.likelyIntent.englishGloss,
    },
  }
}

/**
 * Batch-enrich only the rows where the deterministic resolver couldn't anchor a real
 * Dutch line. Mutates the array in place (preserves array identity for the caller's
 * `voiceAgg.voiceWordCompareItems` reference). Silent on any LLM failure — the original
 * rows stay as-is so the rest of the report continues to render.
 */
async function enrichVoiceWordCompareItemsWithLlmIntent(
  items: LanguageCoachVoiceWordCompareItem[],
): Promise<void> {
  if (items.length === 0) return
  const enrichableIndices: number[] = []
  const inputs: LanguageCoachVoiceWordSemanticInput[] = []
  for (let i = 0; i < items.length; i += 1) {
    const row = items[i]!
    if (!isDeterministicEchoFallback(row.modelDutch)) continue
    enrichableIndices.push(i)
    inputs.push({ weakWord: row.weakWord, contextLine: row.yourLine })
    if (inputs.length >= 6) break
  }
  if (inputs.length === 0) return
  const { suggestions } = await enrichVoiceWordSemantics(inputs)
  if (suggestions.length === 0) return
  const byIndex = new Map<number, (typeof suggestions)[number]>()
  for (let i = 0; i < suggestions.length; i += 1) {
    byIndex.set(i, suggestions[i]!)
  }
  for (let i = 0; i < enrichableIndices.length; i += 1) {
    const rowIdx = enrichableIndices[i]!
    const suggestion = byIndex.get(i)
    items[rowIdx] = mergeVoiceWordSuggestion(items[rowIdx]!, suggestion)
  }
}

/**
 * Post-session pronunciation + rhythm from saved clips (same pipeline as scenario Speak Live reports), averaged across user turns.
 */
async function aggregateLanguageCoachAzureVoice(
  threadId: string,
  messages: ConversationMessage[],
  ctx: {
    improvedPhrasing: Array<{ learnerish: string; better: string }>
    nudgeEvents: LanguageCoachNudgeEvent[] | null | undefined
  },
): Promise<LanguageCoachVoiceAggregate> {
  const empty: LanguageCoachVoiceAggregate = {
    assessedTurns: 0,
    turnsDownloadedOk: 0,
    avg: null,
    sampleFindings: [],
    voiceWordCompareItems: [],
  }
  if (!isAzurePronunciationConfigured()) return empty

  const locale = getAzureSpeechLocale()
  const rolls: { pronunciation: number; clarity: number; rhythm: number; fluency: number }[] = []
  let turnsDownloadedOk = 0
  const findings: string[] = []
  const findingKeys = new Set<string>()
  const voiceWordCompareItems: LanguageCoachVoiceWordCompareItem[] = []
  const wordRowKeys = new Set<string>()

  for (const msg of messages) {
    if (msg.sender !== 'user') continue
    const meta = msg.metadata && typeof msg.metadata === 'object' ? (msg.metadata as Record<string, unknown>) : null
    const blobPath = typeof meta?.learnerAudioBlobPath === 'string' ? meta.learnerAudioBlobPath.trim() : ''
    if (!blobPath) continue

    let audioBuf: Buffer | null = null
    let downloadOk = false
    try {
      const dl = await tryDownloadConversationBinaryArtifact(threadId, blobPath)
      if (dl?.buffer && dl.buffer.length >= 32) {
        audioBuf = dl.buffer
        downloadOk = true
        turnsDownloadedOk += 1
      }
    } catch (e) {
      console.warn('[languageCoachEval] blob download failed', { threadId, blobPath, err: e instanceof Error ? e.message : e })
    }

    const transcriptRaw =
      typeof meta?.transcriptRaw === 'string' && meta.transcriptRaw.trim()
        ? String(meta.transcriptRaw).trim()
        : msg.content.trim()
    const transcriptNormalizedMeta =
      typeof meta?.transcriptNormalized === 'string' && meta.transcriptNormalized.trim()
        ? String(meta.transcriptNormalized).trim()
        : null
    const referenceForPa = (transcriptNormalizedMeta ?? transcriptRaw).trim() || msg.content.trim()
    if (!referenceForPa.trim()) continue

    const mimeType = typeof meta?.learnerAudioMimeType === 'string' ? String(meta.learnerAudioMimeType) : 'audio/webm'

    try {
      const prep = await prepareLiveTurnVoicePrep({
        audio: audioBuf,
        mimeType,
        transcriptRaw,
        transcriptNormalizedMeta,
        referenceForPa,
        blobPath,
        source: 'post_session',
        downloadOk,
        locale,
        turnId: msg.id,
        turnRecordedAtMs: (() => {
          const t = Date.parse(msg.createdAt)
          return Number.isFinite(t) ? t : null
        })(),
      })
      if (prep.audioDiagnostics.assessmentOk && prep.assessment) {
        rolls.push({
          pronunciation: prep.audioScores.pronunciation,
          clarity: prep.audioScores.clarity,
          rhythm: prep.audioScores.rhythm,
          fluency: prep.audioScores.fluency,
        })
        if (findings.length < 6) {
          const tip = pickLearnerVoiceTipLine(prep)
          if (tip) {
            const k = tip.toLowerCase()
            if (!findingKeys.has(k)) {
              findingKeys.add(k)
              findings.push(tip)
            }
          }
        }
        const tipLine = prep.audioFindings.map((x) => (x ?? '').trim()).find((t) => t.length > 0)
        let weakIdx = 0
        for (const w of prep.weakWordList) {
          const word = (w ?? '').trim()
          if (!word || voiceWordCompareItems.length >= 6) break
          const rowKey = `${word.toLowerCase()}|${referenceForPa.slice(0, 72).toLowerCase()}`
          if (wordRowKeys.has(rowKey)) continue
          wordRowKeys.add(rowKey)
          const modelDutch = resolveModelDutchForWeakWord(word, referenceForPa, ctx.improvedPhrasing, ctx.nudgeEvents)
          voiceWordCompareItems.push({
            id: `lc-vw-${voiceWordCompareItems.length}-${word.slice(0, 18)}`,
            weakWord: word,
            yourLine: referenceForPa.slice(0, 280),
            modelDutch,
            ...(weakIdx === 0 && tipLine ? { tip: tipLine } : {}),
          })
          weakIdx += 1
        }
      }
    } catch (e) {
      console.warn('[languageCoachEval] prepareLiveTurnVoicePrep failed', {
        threadId,
        blobPath,
        err: e instanceof Error ? e.message : e,
      })
    }
  }

  if (rolls.length === 0) {
    return { assessedTurns: 0, turnsDownloadedOk, avg: null, sampleFindings: findings, voiceWordCompareItems }
  }
  const n = rolls.length
  const avg = {
    pronunciation: clamp100(rolls.reduce((s, x) => s + x.pronunciation, 0) / n),
    clarity: clamp100(rolls.reduce((s, x) => s + x.clarity, 0) / n),
    rhythm: clamp100(rolls.reduce((s, x) => s + x.rhythm, 0) / n),
    fluency: clamp100(rolls.reduce((s, x) => s + x.fluency, 0) / n),
  }
  return { assessedTurns: rolls.length, turnsDownloadedOk, avg, sampleFindings: findings, voiceWordCompareItems }
}

/**
 * Post-session coach debrief for `language_coach` — transcript + persisted weakness hits;
 * avoids the heavy scenario-scoring orchestrator path (no per-turn Azure pronunciation on this path yet).
 */
export async function buildLanguageCoachEvaluationRecord(input: {
  threadId: string
  scenario: ScenarioConfig
  learnerLevel: string
  messages: ConversationMessage[]
  summaryText: string | null | undefined
  speakLiveStateJson?: string | null
}): Promise<LiveSessionEvaluation> {
  const now = new Date().toISOString()
  const reportedLearnerLevel = resolveReportedLearnerLevel(input.messages, input.learnerLevel)
  const sessionDurationSeconds = computeSessionDurationSeconds(input.messages)
  const msgTime = (m: ConversationMessage): string => {
    const c = m.createdAt as unknown
    if (c instanceof Date) return c.toISOString()
    if (typeof c === 'string' && c.trim()) return new Date(c).toISOString()
    return now
  }
  const userTurns = input.messages.filter((m) => m.sender === 'user')
  const sl = parseSpeakLiveState(input.speakLiveStateJson ?? null)
  const lc = sl?.languageCoach
  const conversationRole = lc?.conversationRole ?? 'coach'
  const coachGuideWhileSpeaking = conversationRole === 'coach' && Boolean(lc?.coachGuideWhileSpeaking)
  const roleFrameEn = roleReportFramingLine(conversationRole)
  /**
   * Multi-source weakness aggregation at report-build time. Replaces the previous
   * heuristic-only `weaknessHits = lc.weaknessHits ?? {}` read because:
   *
   *   The live regex heuristic misses most of what the COACH LLM actually corrects
   *   live (perfectum slips, article confusion, word-order, etc.). The corrections
   *   show up in the chat (the learner sees them) but are not structured signals,
   *   so the report renders the bland "no patterns detected" headline even after a
   *   session where the coach corrected the learner repeatedly.
   *
   * `aggregateLanguageCoachWeaknessSignals` unions five evidence sources:
   *   1. Live heuristic counts from the persisted blob.
   *   2. Retroactive heuristic re-scan over user turns (picks up shipped detector
   *      improvements without schema migration).
   *   3. `nudgeEvents.detectedIssueTypes` → real coach corrections that fired the
   *      nudge engine.
   *   4. Coach reply mining — counts Dutch perfectum/imperfectum forms, explicit
   *      teaching markers ("verleden tijd", "woordvolgorde", "de/het", …), and
   *      correction phrases ("bedoel je", "beter:", …) in assistant messages.
   *      This is the catchall that surfaces LLM-only recasts.
   *   5. The LLM's own `rollingSummaryEnglish` notes, scanned for grammar focus
   *      phrases ("past tense", "wrong auxiliary", "word order", …).
   *
   * See `languageCoachSignalAggregation.ts` for source details and per-source caps.
   */
  const aggregated = aggregateLanguageCoachWeaknessSignals({
    lc: lc ?? null,
    messages: input.messages,
    rollingSummaryEnglish: sl?.rollingSummaryEnglish ?? null,
  })
  const weaknessHits = aggregated.weaknessHits
  const patterns = topWeakPatterns(weaknessHits, 8)
  /**
   * Raw weakness-tag list, in the same frequency order as `patterns` (which holds the
   * humanized labels). Kept alongside so downstream consumers — specifically the
   * "Pattern focus" hint builder below — can look up pattern-specific drills by tag
   * without re-humanizing or string-matching the user-facing label.
   */
  const topWeaknessTags = Object.entries(weaknessHits)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k)
  /**
   * Positive evidence for real follow-up engagement: count user turns that actually
   * contained a question (`?`) AND a Dutch WH-word. Feeds the tightened handoff rule
   * so the "follow-up questions felt steady" line only fires when learners actually
   * asked them — not when the absence of `weak_follow_up` is mistaken for presence
   * of strong engagement (the bug behind the bland "felt steady" hero on a
   * grammar-struggle session).
   */
  const DUTCH_QUESTION_WORD_RX = /\b(wat|hoe|waar|wanneer|wie|waarom|welke|welk)\b/i
  let userFollowUpQuestionCount = 0
  for (const m of userTurns) {
    const text = typeof m.content === 'string' ? m.content : ''
    if (text.includes('?') && DUTCH_QUESTION_WORD_RX.test(text)) {
      userFollowUpQuestionCount += 1
    }
  }
  const strengths: string[] = []
  if (userTurns.length >= 4) strengths.push('You kept the conversation going long enough for real practice.')
  if (!patterns.length) strengths.push('No strong error patterns stood out, so the focus is on keeping your Dutch natural and moving.')
  else strengths.push('You kept speaking actively, which is the base for progress.')

  const dutchSampleLines = userTurns
    .slice(-6)
    .map((m) => m.content.trim())
    .filter(Boolean)
  /** Compact string for heuristics / legacy fields (still avoids huge payloads). */
  const transcriptSnippet = dutchSampleLines.join(' / ').slice(0, 900)

  const userTextBodiesEarly = userTurns.map((m) => m.content.trim()).filter(Boolean)
  const improvedPhrasingExamplesEarly = buildImprovedPhrasingExamples(
    userTextBodiesEarly,
    lc?.nudgeEvents,
    input.messages,
  )

  const voiceAgg = await aggregateLanguageCoachAzureVoice(input.threadId, input.messages, {
    improvedPhrasing: improvedPhrasingExamplesEarly,
    nudgeEvents: lc?.nudgeEvents ?? null,
  })

  /**
   * LLM semantic enrichment for any voice-compare row whose `modelDutch` fell back to
   * the deterministic "Say this line again with a clearer 'X'" template AND whose weak
   * word doesn't match anywhere in the learner line as a known Dutch token. These rows
   * are the "gernen" case: Azure heard a token, the deterministic resolver couldn't find
   * a coach correction or improved-phrasing pair to anchor it, so it echoed the misheard
   * word back. We send those rows to the fast model as one batched call to infer the
   * likely Dutch word the learner intended (e.g. "gerend") and a clean corrected sentence.
   *
   * Failure modes (timeout, JSON parse error, schema mismatch) ALL keep the original
   * deterministic fallback in place — see the `null`-safe merge below. No defaults, no
   * fabricated suggestions.
   */
  await enrichVoiceWordCompareItemsWithLlmIntent(voiceAgg.voiceWordCompareItems)

  const cleanPatternLine = (p: string) => p.replace(/\s*\(×\d+\)\s*$/, '').trim()
  const patternExampleA = patterns[0] ? cleanPatternLine(patterns[0]) : ''

  /**
   * Goal-aware fallback for `focusLabel` when the heuristics didn't surface a specific
   * pattern. Old default ("Phrase things more naturally") was the same regardless of
   * what the learner had picked, so a Grammar-focused session with no detected patterns
   * shipped the same headline as a Fluency-focused one — generic, low-signal copy.
   * Now the fallback at least reflects the learner's chosen focus area while we keep
   * working on heuristic coverage.
   */
  const goalFallbackFocusLabel = (() => {
    switch (lc?.conversationGoal) {
      case 'grammar':
        return 'Dutch grammar control'
      case 'fluency':
        return 'Speak more fluidly'
      case 'pronunciation':
        return 'Clearer Dutch pronunciation'
      case 'confidence':
        return 'Speaking with more confidence'
      case 'storytelling':
        return 'Building fuller stories'
      case 'follow_up_questions':
        return 'Asking more follow-up questions'
      default:
        return 'Phrase things more naturally'
    }
  })()
  const focusLabel = patterns[0]?.replace(/\s*\(×\d+\)\s*$/, '') || goalFallbackFocusLabel

  const sessionHandoff = computeLanguageCoachSessionHandoff({
    lc: lc ?? null,
    userTurnCount: userTurns.length,
    topWeakPatterns: patterns,
    userFollowUpQuestionCount,
  })

  const patternSentence =
    patterns.length ?
      `Patterns to practice: ${patterns.slice(0, 3).join('; ')}.`
    : 'No strong error clusters stood out, so keep building fluency and vocabulary.'

  const coachSummary = `${roleCoachSummaryPrefixNl(conversationRole, userTurns.length)} ${patternSentence}`

  const dims: ScoredDimension[] = [
    {
      id: 'fluency_flow',
      label: 'Fluency / flow',
      score: clamp100(78 - Math.min(28, patterns.length * 4)),
      confidence: transcriptSnippet ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: patterns.length ? 'Room to become smoother' : 'Fairly fluent',
      meaning:
        transcriptSnippet && patternExampleA ?
          `We noticed recurring bumps in smoothness — ${patternExampleA.slice(0, 72)}${patternExampleA.length > 72 ? '…' : ''} kept coming up as something to tighten.`
        : transcriptSnippet ?
          'Based on how much you said and how evenly your Dutch came out across the chat.'
        : 'Only a little Dutch showed up in the transcript, so treat this as a soft estimate.',
    },
    {
      id: 'naturalness',
      label: 'Naturalness',
      score: clamp100(74 - Math.min(22, (weaknessHits.english_fallback ?? 0) * 8)),
      confidence: 'medium',
      evidenceType: 'transcript',
      verdict: (weaknessHits.english_fallback ?? 0) > 1 ? 'Try to stay in Dutch more consistently' : 'OK',
      meaning:
        (weaknessHits.english_fallback ?? 0) > 1 ?
          'Several slips into English showed up; staying in Dutch a beat longer usually lifts this score.'
        : 'You mostly stayed in Dutch, which keeps your ear and mouth in the same language.',
    },
    {
      id: 'grammar_control',
      label: 'Grammar control',
      score: clamp100(72 - Math.min(30, (weaknessHits.past_tense ?? 0) * 6 + (weaknessHits.word_order ?? 0) * 5)),
      confidence: 'medium',
      evidenceType: 'transcript',
      verdict: patterns.length ? 'Patterns worth repeating and cleaning up' : 'No major red flags',
      meaning: patternExampleA
        ? `The thread we kept seeing was around ${patternExampleA.slice(0, 72)}${patternExampleA.length > 72 ? '…' : ''}. This is a quick wording scan, not a full grammar review.`
        : 'Nothing dominated the transcript, so this reflects overall wording habits rather than one fixed error.',
    },
    {
      id: 'follow_up',
      label: 'Follow-up engagement',
      score: clamp100(70 - Math.min(24, (weaknessHits.follow_up_gap ?? 0) * 6)),
      confidence: 'low',
      evidenceType: 'transcript',
      verdict: 'Work on asking follow-up questions',
      meaning:
        (weaknessHits.follow_up_gap ?? 0) > 0 ?
          'Some answers stopped short of nudging the chat forward — a tiny question at the end often helps.'
        : 'Your answers tended to keep the thread open for more dialogue.',
    },
  ]

  if (voiceAgg.avg) {
    const n = voiceAgg.assessedTurns
    const clipLabel = n === 1 ? 'reply' : 'replies'
    const conf = n >= 4 ? 'medium' : n >= 2 ? 'medium' : 'low'
    const p = voiceAgg.avg.pronunciation
    const c = voiceAgg.avg.clarity
    const r = voiceAgg.avg.rhythm
    dims.push(
      {
        id: 'speaking_pronunciation',
        label: 'Pronunciation',
        score: p,
        confidence: conf,
        evidenceType: 'audio',
        verdict: p >= 78 ? 'Sounds crisp enough to build on' : 'Some sounds landed less distinctly than in native Dutch',
        meaning: `We averaged how crisp your Dutch consonants and vowels sounded across ${n} short voice ${clipLabel} from this session.`,
      },
      {
        id: 'speaking_clarity',
        label: 'Speaking clarity',
        score: c,
        confidence: conf,
        evidenceType: 'audio',
        verdict: c >= 78 ? 'Words were usually easy to pick out' : 'A few stretches were harder to pick out clearly',
        meaning: `How easy your words were to make out on those same ${n} recordings, including the ends of words.`,
      },
      {
        id: 'speaking_rhythm',
        label: 'Rhythm & pacing',
        score: r,
        confidence: conf,
        evidenceType: 'audio',
        verdict: r >= 76 ? 'Flow is in a healthy range' : 'Pauses and chunking could be smoother',
        meaning: `How naturally your sentences flowed on those ${n} recordings — short thinking pauses are normal while you compose in Dutch.`,
      },
    )
  }

  const overallScore = clamp100(dims.reduce((s, d) => s + (d.score ?? 0), 0) / dims.length)

  const softScoreThreshold = 78
  const conversationScoreHints: string[] = []
  const hintSeen = new Set<string>()
  const pushConversationHint = (line: string) => {
    const t = line.trim()
    if (!t || hintSeen.has(t)) return
    hintSeen.add(t)
    conversationScoreHints.push(t)
  }
  /**
   * Each soft-scored dimension gets exactly one hint. We prefer concrete, transcript-grounded
   * hints — pick the best `improvedPhrasingExamples` pair for that dimension and embed it
   * verbatim as `e.g. "learnerish" → "better"`. Pairs are consumed (not reused across
   * dimensions) so the hint list never repeats the same example. Only when no per-dimension
   * pair can be matched and the unused pool is empty do we fall back to the original generic
   * coaching template — keeping the field non-empty without inventing fake evidence.
   */
  const usedExampleKeys = new Set<string>()
  const exampleKey = (p: { learnerish: string; better: string }) =>
    `${p.learnerish.toLowerCase()}→${p.better.toLowerCase()}`
  const truncateForHint = (s: string, max: number): string =>
    s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`
  const formatPair = (p: { learnerish: string; better: string }): string =>
    `e.g. “${truncateForHint(p.learnerish, 80)}” → “${truncateForHint(p.better, 90)}”.`
  /**
   * Heuristics that catch the dimension's most likely fingerprint inside a phrasing pair.
   * Returns the first matching unused pair, or `null` when no pair fits. Callers fall back to
   * the next-unused pair (any topic) before the generic template, so the worst case is still
   * a transcript-grounded example.
   */
  const pickPairFor = (
    dimensionId: string,
    examples: Array<{ learnerish: string; better: string }>,
  ): { learnerish: string; better: string } | null => {
    for (const p of examples) {
      if (usedExampleKeys.has(exampleKey(p))) continue
      const learnerish = p.learnerish
      const better = p.better
      if (dimensionId === 'fluency_flow') {
        /** Fluency hint = coach materially lengthened a short reply. */
        if (better.length >= learnerish.length * 1.6 && learnerish.length <= 60) return p
      } else if (dimensionId === 'naturalness') {
        /** English fallback fingerprint: common English-only words inside the learner line. */
        if (/\b(the|and|but|because|something|nothing|already|really|maybe|i'm|don't|with)\b/i.test(learnerish)) {
          return p
        }
      } else if (dimensionId === 'follow_up') {
        /** Coach modelled a short follow-up question that the learner didn't ask. */
        if (better.trim().endsWith('?') && !learnerish.trim().endsWith('?')) return p
      } else if (dimensionId === 'grammar_control') {
        /** Generic grammar fix: take the first unused pair (any reordering / agreement). */
        return p
      }
    }
    /** No dimension-specific match — take the first unused pair as still-concrete evidence. */
    for (const p of examples) {
      if (!usedExampleKeys.has(exampleKey(p))) return p
    }
    return null
  }
  /**
   * Pattern-focus pair picker. Each weakness tag has its own fingerprint inside a phrasing
   * pair — e.g. for `past_tense` we look for the coach reply containing a perfectum
   * participle (`ge…en`/`ge…d`), or for `article` we look for the coach reply containing
   * "de " or "het " where the learner missed it. Returns the first unused matching pair
   * or `null` if no transcript-grounded match — in which case the caller falls back to
   * the pattern-specific drill text.
   */
  const pickPatternFocusPair = (
    tag: string,
    examples: Array<{ learnerish: string; better: string }>,
    usedKeys: Set<string>,
    keyFn: (p: { learnerish: string; better: string }) => string,
  ): { learnerish: string; better: string } | null => {
    for (const p of examples) {
      if (usedKeys.has(keyFn(p))) continue
      const learner = p.learnerish.toLowerCase()
      const better = p.better.toLowerCase()
      if (tag === 'past_tense') {
        if (/\b(?:ge[a-zà-ÿ]{2,}en|ge[a-zà-ÿ]{2,}d|ge[a-zà-ÿ]{2,}t)\b/.test(better)) return p
      } else if (tag === 'article') {
        if (/\b(?:de|het)\b/.test(better) && !/\b(?:de|het)\b/.test(learner)) return p
      } else if (tag === 'word_order') {
        /** Coach reply puts the verb in second position; pair if word counts are similar (reordering, not lengthening). */
        if (better.split(/\s+/).length >= 4 && Math.abs(better.length - learner.length) < learner.length * 0.5) return p
      } else if (tag === 'question_form') {
        if (better.trim().endsWith('?')) return p
      } else if (tag === 'english_fallback') {
        if (/\b(?:the|and|but|because|with|don't|i'm|something|already)\b/.test(learner)) return p
      } else if (tag === 'follow_up_gap') {
        if (better.trim().endsWith('?') && !learner.trim().endsWith('?')) return p
      } else if (tag === 'short_fragments') {
        if (better.split(/\s+/).length >= learner.split(/\s+/).length + 3) return p
      }
    }
    return null
  }
  /**
   * Pattern-specific drill text — keyed by raw weakness tag, NOT humanized label, so the
   * pattern-focus block can pick the drill without round-tripping through the label map.
   * Each entry is a concrete Dutch-first practice instruction with at least one model line
   * so the learner can read it out loud immediately. We deliberately do NOT include
   * `follow_up_gap` here because the dimension hint above already covers it ("end your
   * answer with a short Dutch question") and duplicating reads as repetitive UI noise.
   */
  const PATTERN_FOCUS_DRILLS: Record<string, string> = {
    past_tense:
      'say three perfectum lines out loud — "Ik ben gisteren naar de winkel gegaan.", "Ik heb een boek gelezen.", "We zijn naar Amsterdam geweest." Notice the auxiliary (ben/heb) + the ge- participle at the end.',
    word_order:
      'practice verb-second order in three lines — "Gisteren ben ik naar de winkel gegaan.", "Vandaag werk ik thuis.", "Morgen ga ik naar mijn moeder." The conjugated verb is always the second element.',
    article:
      'drill de/het with five short noun phrases — "de tafel", "het boek", "de stoel", "het huis", "de man". Say each one twice; if you guess wrong, repeat the correct one three times.',
    question_form:
      'practice three short Dutch questions out loud — "Wat heb je gisteren gedaan?", "Hoe was je weekend?", "Waar woon je?" Notice the verb comes right after the question word.',
    wrong_word_choice:
      'pick one slip from this session and rephrase it twice in your own words out loud, focusing on the verb + preposition you used wrongly.',
    english_fallback:
      'pick three moments where you switched to English and rebuild each one entirely in Dutch — even slowly. "Ik weet het niet meer, maar …" is a useful bridge.',
    short_fragments:
      'extend three of your answers from this session by one extra clause each — add "omdat …" or "en dan …" to push past two-word replies.',
    low_clarity:
      'rebuild three of your sentences with a clear subject-verb-object order: subject first, conjugated verb second, then the rest.',
    grammar_combo:
      'pick the one slip the coach corrected most, write the corrected Dutch line, and say it out loud three times before your next session.',
    hesitation:
      'pick three of your replies and re-say them at a slightly slower pace without the filler words ("ehm", "uh") — even one cleaner take helps.',
    simple_repeat:
      'take one pattern you used twice this session and rewrite it two different ways (e.g. start with the time word, or use "omdat" to link a reason).',
  }
  const dimensionGenericFallback: Record<string, string> = {
    fluency_flow:
      'Fluency / flow: aim for slightly longer chunks (about 6–12 words) before you pause so sentences hang together.',
    naturalness:
      'Naturalness: stay in Dutch for full answers when you can, and avoid translating word-for-word from English.',
    grammar_control:
      'Grammar control: pick one recurring cue from your weak patterns and drill it in five short spoken lines.',
    follow_up:
      'Follow-up: end one answer per turn with a short Dutch question so the thread moves forward naturally.',
  }
  for (const d of dims.filter((d) => d.evidenceType === 'transcript')) {
    if ((d.score ?? 100) >= softScoreThreshold) continue
    const pair = pickPairFor(d.id, improvedPhrasingExamplesEarly)
    if (pair) {
      usedExampleKeys.add(exampleKey(pair))
      pushConversationHint(`${d.label}: ${formatPair(pair)}`)
    } else if (dimensionGenericFallback[d.id]) {
      /** No pair available at all — keep the field non-empty with the original coaching line. */
      pushConversationHint(dimensionGenericFallback[d.id]!)
    } else {
      pushConversationHint(`${d.label}: ${d.meaning}`)
    }
  }
  /**
   * Pattern-focus hints are the second-most prominent thing in this card after the
   * dimension hints, so they MUST carry concrete, session-grounded value. Previous
   * implementation emitted a single template per pattern:
   *
   *   "Pattern focus: work on past-tense forms with a few short Dutch lines you say out loud."
   *
   * That reads identical for every learner who ever has a past-tense miss, regardless of
   * what they actually said in the session. The new behaviour, in priority order:
   *
   *   1. If we have a transcript-grounded pair (`improvedPhrasingExamples`) whose
   *      learnerish line matches the pattern's fingerprint, surface it verbatim:
   *        "Past-tense forms: try saying \"…\" instead of \"…\"."
   *      This is the strongest possible signal because it quotes the learner and the
   *      coach's actual recast from this session.
   *   2. Otherwise emit a SPECIFIC, ready-to-speak Dutch drill keyed to the pattern
   *      (e.g. perfectum: "Ik ben gisteren naar de winkel gegaan." — three short lines).
   *      Generic and pattern-aware, but still concrete vs. the old "say a few lines".
   *   3. Only when neither is available do we fall back to the humanized label alone.
   */
  for (let i = 0; i < Math.min(topWeaknessTags.length, 2); i += 1) {
    const tag = topWeaknessTags[i]!
    const humanLabel = humanizeLanguageCoachWeaknessTag(tag)
    const sentenceCaseLabel = humanLabel.charAt(0).toUpperCase() + humanLabel.slice(1)

    const pair = pickPatternFocusPair(tag, improvedPhrasingExamplesEarly, usedExampleKeys, exampleKey)
    if (pair) {
      usedExampleKeys.add(exampleKey(pair))
      pushConversationHint(
        `${sentenceCaseLabel}: try saying “${truncateForHint(pair.better, 90)}” instead of “${truncateForHint(
          pair.learnerish,
          80,
        )}”.`,
      )
      continue
    }

    const drill = PATTERN_FOCUS_DRILLS[tag]
    if (drill) {
      pushConversationHint(`${sentenceCaseLabel}: ${drill}`)
      continue
    }

    /** Tag has no drill entry yet — keep the field non-empty without inventing fake evidence. */
    pushConversationHint(`${sentenceCaseLabel}: drill three short Dutch lines on this out loud.`)
  }
  const conversationScoreHintsCapped = conversationScoreHints.slice(0, 6)
  const voiceImprovementFindings =
    voiceAgg.sampleFindings.length > 0 ? voiceAgg.sampleFindings.slice(0, 8) : undefined

  const audioBlobTurns = countUserTurnsWithLearnerAudioBlob(input.messages)
  const audioIssues: string[] = []
  if (audioBlobTurns === 0 && userTurns.length > 0) {
    audioIssues.push(
      'We could not find saved voice clips for this session — check the mic was on and uploads finished.',
    )
  } else if (audioBlobTurns > 0 && !isAzurePronunciationConfigured()) {
    audioIssues.push(
      'Voice clips were saved, but this environment is not set up to grade them automatically — you still get full text-based feedback.',
    )
  } else if (audioBlobTurns > 0 && voiceAgg.assessedTurns === 0) {
    if (voiceAgg.turnsDownloadedOk === 0) {
      audioIssues.push(
        'We saw links to voice clips, but could not load the audio. Try “Rebuild report from scratch” after checking your connection.',
      )
    } else {
      audioIssues.push(
        'We heard at least one clip, but it was too short or unclear to score reliably. Try holding each reply a little longer.',
      )
    }
  } else if (audioBlobTurns > 0 && voiceAgg.assessedTurns < audioBlobTurns) {
    audioIssues.push(
      `We fully graded ${voiceAgg.assessedTurns} of ${audioBlobTurns} voice replies; a few could not be scored.`,
    )
  }

  const evidenceSummary: EvidenceSummary = {
    transcriptAvailable: Boolean(transcriptSnippet),
    audioTurnCount: audioBlobTurns,
    transcriptTurnCount: userTurns.length,
    azurePronunciationTurnCount: voiceAgg.assessedTurns,
    llmLanguageTurnCount: 0,
    referenceAudioTurnCount: 0,
    totalLearnerTurnCount: userTurns.length,
    audioPipelineDiagnostics: {
      totalTurns: userTurns.length,
      turnsWithBlobPath: audioBlobTurns,
      turnsDownloadedOk: voiceAgg.turnsDownloadedOk,
      turnsAssessedOk: voiceAgg.assessedTurns,
      turnsAudioBacked: audioBlobTurns,
      turnsWithScores: voiceAgg.assessedTurns,
      issues: audioIssues,
    },
  }

  const taskOutcome: TaskOutcome = {
    goals: [],
    completed: [],
    missed: [],
    goalEvidence: [],
    goalChecklistPercent: undefined,
    weightedCompletion: undefined,
  }

  const sessionInsights: SessionEvaluationInsights = {
    overallGrammarSentenceScore: dims.find((d) => d.id === 'grammar_control')?.score ?? 0,
    overallNaturalness: dims.find((d) => d.id === 'naturalness')?.score ?? 0,
    strongestAreas: strengths,
    weakestAreas: patterns.length ? patterns : ['No strong recurring pattern yet, so keep building speaking volume.'],
    mostImportantNextStep: `Focus: ${focusLabel} — choose one mini-drill each day.`,
  }

  const recommendedFollowUps: RecommendedFollowUp[] = roleRecommendedFollowUps(conversationRole)

  /**
   * Enrich each nudge log row at the producer (single source of truth) so the slim
   * "How your coach guided you" UI doesn't have to re-implement extraction or humanization:
   *
   *   - `coachCorrectionLine`: just the isolated corrected Dutch (or null if the reply was
   *     conversational prose only). Same extractor used by `buildImprovedPhrasingExamples`.
   *   - `humanizedSignals`: learner-facing labels for `detectedIssueTypes` (so the UI can
   *     show "asking follow-up questions" instead of `follow_up_gap`). Falls back gracefully
   *     for unknown future tags (see `humanizeLanguageCoachWeaknessTag`).
   *
   * `coachResponseSnippet` is kept verbatim for backward compatibility with any consumer that
   * still wants the raw reply (e.g. skill evidence extractor in `extractSkillEvidenceFromCoachReport.ts`).
   */
  const nudgeSessionLog =
    lc?.nudgeEvents?.length ?
      lc.nudgeEvents.slice(-12).map((e) => {
        const humanizedSignals = e.detectedIssueTypes
          .map((tag) => humanizeLanguageCoachWeaknessTag(tag))
          .filter((label, idx, arr) => label.length > 0 && arr.indexOf(label) === idx)
        return {
          nudgeType: e.nudgeType,
          learnerOriginal: e.learnerOriginal.slice(0, 240),
          coachResponseSnippet: e.coachResponse.slice(0, 420) + (e.coachResponse.length > 420 ? '…' : ''),
          coachCorrectionLine: pickBetterLineFromCoachReply(e.coachResponse),
          detectedIssueTypes: e.detectedIssueTypes,
          humanizedSignals,
          severity: e.severity,
          learnerRecoveredLater: e.learnerRecoveredLater,
        }
      })
    : undefined

  const sessionSig = lc?.sessionSignals ?? {}
  const observedLevelInfo = deriveObservedCoachLevel({
    practicedLevel: reportedLearnerLevel,
    userTurnCount: userTurns.length,
    sessionSignals: sessionSig,
    weaknessHits,
  })
  /**
   * Headline composition: skill highlight + named growth area + (when available) a short
   * concrete Dutch example pulled from this session's transcript via
   * `improvedPhrasingExamplesEarly`. The example is only appended when
   * `buildImprovedPhrasingExamples` returned a transcript-grounded pair (no canned text, no
   * fabricated quotes — see the JSDoc on that function) AND when both sides fit a tight
   * length budget so the headline still reads as one line, not a paragraph. Longer phrasings
   * are still rendered in full in the dedicated "Phrasing" card below the headline.
   */
  /**
   * Surface the strongest transcript-grounded pair as a STRUCTURED field
   * (`coachOneLinerExample`) instead of inlining quotes into the headline. The previous
   * implementation appended ` For example: "…" → "…"` to the H1 string, which the UI
   * rendered as a giant bolded run-on:
   *
   *   "You produced several longer, relatively clean sentences, which is good for
   *    fluency. Your main growth area: past-tense forms. For example: '…' → '…'."
   *
   * Splitting the example out lets the frontend render it as a small, visually
   * subordinated evidence card below the H1 (see `LanguageCoachDedicatedReport.tsx`).
   *
   * Quality gate (stricter than `pickPatternFocusPair` because this pair is the FIRST
   * thing the learner reads):
   *   - Both sides fit a tight length budget so the card reads at a glance.
   *   - The `better` side must contain at least one perfectum participle / imperfectum
   *     form / clear restructuring marker, OR the learner side must end without `?`
   *     (clean learner questions like "Kan ik perfectum leren, alsjeblieft?" are usually
   *     followed by topical agreement, not a recast, and would surface as noise).
   */
  const HEADLINE_EXAMPLE_MAX_SIDE = 80
  const HEADLINE_EXAMPLE_RECAST_RX =
    /\b(?:gegaan|gekomen|geweest|gebleven|gewerkt|gegeten|gedronken|gelezen|gemaakt|gezegd|gezien|gehoord|gewacht|gewoond|gezocht|gekookt|geschreven|gevonden|gespeeld|geprobeerd|geleerd|gestudeerd|gekeken|gevraagd|geantwoord|gehad|gewassen|gedaan|gebruikt|gebracht|gekocht|was|waren|had|hadden|ging|gingen|werkte|woonde|leerde|maakte|bedoel je|beter is|probeer)\b/i
  const headlineExample = (() => {
    for (const candidate of improvedPhrasingExamplesEarly) {
      if (candidate.learnerish.length > HEADLINE_EXAMPLE_MAX_SIDE) continue
      if (candidate.better.length > HEADLINE_EXAMPLE_MAX_SIDE) continue
      const learnerIsCleanQuestion =
        candidate.learnerish.trim().endsWith('?') && candidate.better.toLowerCase().startsWith('goed')
      if (learnerIsCleanQuestion) continue
      if (!HEADLINE_EXAMPLE_RECAST_RX.test(candidate.better)) continue
      return candidate
    }
    return null
  })()
  const coachOneLinerExample = headlineExample
    ? { learnerish: headlineExample.learnerish.trim(), better: headlineExample.better.trim() }
    : null
  /**
   * Headline COACH IN ONE LINE shown at the top of the report. Two shapes:
   *
   *   - With concrete pattern signal: "<strongest skill>. Your main growth area:
   *     <pattern>. For example: …" — same as before, this is the high-value case.
   *   - With NO pattern signal: instead of pretending we know the growth area (the
   *     old fallback shipped a generic "Your main growth area: Phrase things more
   *     naturally." which read as the same headline regardless of what the learner
   *     actually struggled with), we now hedge with the learner's chosen focus and
   *     explicitly say the short session didn't surface specific recurring slips.
   *
   * Honesty here directly fixes the "this report isn't useful" complaint on short
   * sessions where heuristics can't see enough text — better to admit a low-signal
   * read than to manufacture confident-sounding generic copy.
   */
  const coachOneLinerEnglish = patterns.length
    ? `${sessionHandoff.strongestSkillShown} Your main growth area: ${focusLabel}.`.slice(0, 240)
    : `${sessionHandoff.strongestSkillShown} We didn't pick up specific recurring slips in this short session, so the focus for next round stays on ${goalFallbackFocusLabel.toLowerCase()}. Speaking in longer Dutch turns helps the coach spot patterns.`.slice(
        0,
        320,
      )

  const whatImprovedDuringSession = (() => {
    if ((sessionSig.fluent_stretch_turn ?? 0) >= 1 || (sessionSig.clean_natural_turn ?? 0) >= 2) {
      return 'As the conversation went on, you had moments with longer, cleaner sentences, which is good for natural flow.'
    }
    if (lc?.nudgeEvents?.some((e) => e.learnerRecoveredLater === true)) {
      return conversationRole === 'coach'
        ? 'You recovered at least one earlier weak point, which showed up in the coach nudges after a recast.'
        : 'You recovered from at least one earlier difficulty, and your next response sounded cleaner afterward.'
    }
    if (userTurns.length >= 5) {
      return 'You kept the conversation going long enough for real practice, and that persistence already helps fluency.'
    }
    return 'Even short exchanges count, but speaking a bit longer next time will give a richer coaching signal.'
  })()

  const howCoachGuidedYou: string[] = []
  if (conversationRole === 'coach') {
    howCoachGuidedYou.push(
      coachGuideWhileSpeaking
        ? 'Coach mode with “Guide me while speaking”: more active short support during the conversation, such as a recast, sentence starter, or simpler question when you get stuck.'
        : 'Coach mode without live guide: mostly natural conversation with subtle recasts, then deeper feedback after the session.',
    )
  }
  if (lc?.nudgeEvents?.length) {
    const recent = lc.nudgeEvents.slice(-6)
    for (const e of recent) {
      const kind =
        e.nudgeType === 'RECAST'
          ? 'Implicit recast'
          : e.nudgeType === 'CLARIFY'
            ? 'Clarification'
            : e.nudgeType === 'EXPAND'
              ? 'Follow-up / expansion'
              : 'Model line (used sparingly)'
      const useful =
        e.learnerRecoveredLater === true ? ' — useful: you handled it more cleanly afterward.' : ''
      howCoachGuidedYou.push(
        `${kind} (${e.severity}) on: “${e.learnerOriginal.slice(0, 72)}${e.learnerOriginal.length > 72 ? '…' : ''}”${useful}`,
      )
    }
  } else {
    howCoachGuidedYou.push(howGuidedFallbackNl(conversationRole))
  }

  const guidanceMomentsUseful =
    lc?.nudgeEvents
      ?.filter((e) => e.learnerRecoveredLater === true)
      .slice(-4)
      .map((e) => {
        const kind =
          e.nudgeType === 'RECAST'
            ? 'recast'
            : e.nudgeType === 'CLARIFY'
            ? 'clarification'
              : e.nudgeType === 'EXPAND'
                ? 'follow-up'
                : 'model line'
        return `After this ${kind}, your next response sounded stronger around: “${e.learnerOriginal.slice(0, 56)}${e.learnerOriginal.length > 56 ? '…' : ''}”.`
      }) ?? []

  const improvedPhrasingExamples = improvedPhrasingExamplesEarly

  const roleFollowUps = roleFollowUpSuggestionsNl(conversationRole, {
    focusLabel,
    topPattern: patterns[0] ?? null,
    suggestedNextFocus: sessionHandoff.suggestedNextFocus,
  })
  const roleSavePrompts = roleSavePracticePromptsNl(conversationRole)
  const coachLearningInsights = buildCoachLearningInsights({
    lc,
    handoff: sessionHandoff,
    coachGuideWhileSpeaking,
    topWeakPatternLine: patterns[0] ?? null,
  })
  const roleSaveableItems = buildRoleSaveablePracticeItems({
    role: conversationRole,
    patterns,
    improvedPhrasing: improvedPhrasingExamples,
    handoff: sessionHandoff,
    conversationGoal: lc?.conversationGoal ?? null,
  })

  /**
   * "Plan your next session" — produced from THIS-session signals (humanized weakness
   * patterns, overused vocab stems, Azure-derived weak words). Returns `null` when there is
   * no actionable signal; the UI hides the section in that case. The pinned-focus string
   * inside `coachFocusBrief.pinnedFocusEnglish` is what powers the deep-link → coach prompt
   * spine (via `LanguageCoachStartPayload.pinnedFocusEnglish` →
   * `learnerPinnedLessonFocusEnglish`).
   */
  const nextPracticePlan = buildLanguageCoachNextPracticePlan({
    lc,
    humanizedPatterns: patterns,
    voiceWeakWords: voiceAgg.voiceWordCompareItems.map((w) => w.weakWord),
    practicedLevel: reportedLearnerLevel,
    conversationRole,
  })

  const lastUsefulGuidance = guidanceMomentsUseful[guidanceMomentsUseful.length - 1]
  const guideModeReflection =
    conversationRole === 'coach' && coachGuideWhileSpeaking ?
      {
        neededMoreSupportWith: `You needed more support with ${sessionHandoff.mostRepeatedWeakPattern} — that is where guidance clustered in this session.`,
        strongestRecoveryMoment: lastUsefulGuidance
          ? `Your strongest recovery moment was: ${lastUsefulGuidance}`
          : `Your strongest recovery moment was: ${sessionHandoff.bestExampleImprovement}`.slice(0, 360),
      }
    : undefined

  const pronunciationFluencyNote = (() => {
    const flu = dims.find((d) => d.id === 'fluency_flow')
    const nat = dims.find((d) => d.id === 'naturalness')
    const pr = dims.find((d) => d.id === 'speaking_pronunciation')
    const cl = dims.find((d) => d.id === 'speaking_clarity')
    const rh = dims.find((d) => d.id === 'speaking_rhythm')
    let audioNote = ''
    if (voiceAgg.avg && voiceAgg.assessedTurns > 0 && pr && cl && rh) {
      audioNote = `From ${voiceAgg.assessedTurns} voice ${voiceAgg.assessedTurns === 1 ? 'reply' : 'replies'} in this chat, your rolling scores landed around pronunciation ${pr.score}, clarity ${cl.score}, and rhythm ${rh.score} (each out of 100).`
    } else if (!isAzurePronunciationConfigured()) {
      audioNote =
        'Automatic voice grading is not turned on here, so this section leans on what you typed and how the coach responded.'
    } else if (audioBlobTurns === 0) {
      audioNote = 'No voice clips were stored for this session, so there was nothing to listen back to for pronunciation scores.'
    } else if (voiceAgg.assessedTurns === 0) {
      audioNote =
        'Some voice clips were linked, but none could be graded cleanly. Try “Rebuild report from scratch” after a quick mic check.'
    } else {
      audioNote = ''
    }
    return [
      audioNote,
      flu ? `Fluency from your answers: ${flu.verdict} (${flu.score}/100).` : '',
      nat ? `Naturalness: ${nat.verdict} (${nat.score}/100).` : '',
    ]
      .filter(Boolean)
      .join(' ')
  })()

  const conversationSummary = dutchSampleLines.length
    ? [
        roleFrameEn,
        '',
        'Latest things you said in Dutch (most recent last):',
        ...dutchSampleLines.map((line) => `• ${line}`),
      ].join('\n')
    : `${roleFrameEn} There was not enough transcript to build a rich summary, so speaking a little longer next time will help.`

  const languageCoachDebrief = {
    conversationRole,
    roleSessionEmphasis: roleSessionEmphasisNl(conversationRole),
    conversationSummary,
    conversationSnapshotIntro: roleFrameEn,
    ...(dutchSampleLines.length ? { conversationSnapshotDutchLines: dutchSampleLines } : {}),
    focusAreaLabel: focusLabel,
    strengths,
    weakPatterns: patterns,
    improvedPhrasingExamples,
    followUpSuggestions: roleFollowUps,
    savePracticePrompts: roleSavePrompts,
    ...(nudgeSessionLog ? { nudgeSessionLog } : {}),
    sessionHandoff,
    coachOneLiner: coachOneLinerEnglish,
    ...(coachOneLinerExample ? { coachOneLinerExample } : {}),
    whatImprovedDuringSession,
    howCoachGuidedYou,
    pronunciationFluencyNote,
    ...(conversationRole === 'coach' ? { coachGuideWhileSpeaking } : {}),
    ...(guideModeReflection ? { guideModeReflection } : {}),
    ...(guidanceMomentsUseful.length ? { guidanceMomentsUseful } : {}),
    ...(coachLearningInsights ? { coachLearningInsights } : {}),
    ...(roleSaveableItems.length ? { roleSaveablePracticeItems: roleSaveableItems } : {}),
    ...(voiceImprovementFindings?.length ? { voiceImprovementFindings } : {}),
    ...(conversationScoreHintsCapped.length ? { conversationScoreHints: conversationScoreHintsCapped } : {}),
    ...(voiceAgg.voiceWordCompareItems.length ? { voiceWordCompareItems: voiceAgg.voiceWordCompareItems } : {}),
    ...(nextPracticePlan ? { nextPracticePlan } : {}),
  }

  return {
    sessionId: input.threadId,
    scenarioId: input.scenario.slug,
    scenarioName: input.scenario.title,
    scenarioTitle: input.scenario.title,
    mode: 'speak_reply',
    practicedLevel: reportedLearnerLevel,
    ...(observedLevelInfo ? { observedLevel: observedLevelInfo.observedLevel, levelObservationNote: observedLevelInfo.note } : {}),
    targetLevel: reportedLearnerLevel,
    learnerLevel: reportedLearnerLevel,
    startedAt: input.messages[0] ? msgTime(input.messages[0]!) : now,
    endedAt: input.messages.length ? msgTime(input.messages[input.messages.length - 1]!) : now,
    sessionDurationSeconds,
    durationSec: sessionDurationSeconds,
    learnerTurnCount: userTurns.length,
    turnsCompleted: userTurns.length,
    evidenceSummary,
    keyTakeaway: {
      message: coachSummary,
      evidenceType: 'transcript',
    },
    coachHeadline:
      conversationRole === 'coach'
        ? 'Language Coach — session debrief'
        : `Language Coach — session debrief · ${getConversationRoleProfile(conversationRole).label}`,
    coachSummaryLine: coachSummary,
    focusArea: {
      label: focusLabel,
      why: roleFocusWhyNl(conversationRole),
      exampleLine: 'Choose one fixed sentence and repeat it out loud ten times.',
      cta: 'practice_now',
    },
    taskOutcome,
    overall: {
      dimensions: dims,
      overallScore,
      overallConfidence: 'medium',
    },
    turnEvaluations: [],
    recommendedActions: [],
    sessionAudioMetricsAvailable: Boolean(voiceAgg.avg && voiceAgg.assessedTurns > 0),
    overallScores: {
      overallVoiceScore: voiceAgg.avg
        ? clamp100(
            (voiceAgg.avg.pronunciation + voiceAgg.avg.clarity + voiceAgg.avg.rhythm + voiceAgg.avg.fluency) / 4,
          )
        : overallScore,
      pronunciationScore: voiceAgg.avg ? voiceAgg.avg.pronunciation : null,
      fluencyScore: voiceAgg.avg ? voiceAgg.avg.fluency : dims.find((d) => d.id === 'fluency_flow')?.score ?? null,
      rhythmScore: voiceAgg.avg ? voiceAgg.avg.rhythm : null,
      clarityScore: voiceAgg.avg ? voiceAgg.avg.clarity : overallScore,
      naturalnessScore: dims.find((d) => d.id === 'naturalness')?.score ?? 0,
      scenarioCompletionScore: 0,
      confidenceEstimate: overallScore,
    },
    overallSummary: {
      coachSummary,
      fluencyRhythmSummary: voiceAgg.avg
        ? `Mic-based fluency averaged about ${voiceAgg.avg.fluency}/100 across ${voiceAgg.assessedTurns} graded ${voiceAgg.assessedTurns === 1 ? 'reply' : 'replies'}, alongside the conversation scores above.`
        : 'Free conversation: keep building smoother chunks of 5 to 8 words.',
      pronunciationSummary:
        voiceAgg.avg && voiceAgg.assessedTurns > 0
          ? `Pronunciation ${voiceAgg.avg.pronunciation}/100, speaking clarity ${voiceAgg.avg.clarity}/100, rhythm ${voiceAgg.avg.rhythm}/100 — averaged from ${voiceAgg.assessedTurns} voice ${voiceAgg.assessedTurns === 1 ? 'reply' : 'replies'} we could grade in this session.`
          : audioBlobTurns > 0
            ? isAzurePronunciationConfigured()
              ? `Voice was saved for ${audioBlobTurns} ${audioBlobTurns === 1 ? 'reply' : 'replies'}, but we could not attach scores — try a slightly longer clip or “Rebuild report from scratch”.`
              : `Voice was saved for ${audioBlobTurns} ${audioBlobTurns === 1 ? 'reply' : 'replies'}, but this server is not set up to grade clips automatically.`
            : 'No voice clips were found on saved messages, so pronunciation could not be scored from recordings.',
      whatToTryNext: languageCoachDebrief.followUpSuggestions,
      grammarConstructionSessionSummary: patterns.length
        ? `Patterns: ${patterns.slice(0, 4).join(' · ')}`
        : undefined,
    },
    sessionInsights,
    scenarioOutcome: {
      goalsCompleted: [],
      goalsMissed: [],
      whatWentWell: strengths,
      whatToImproveNext: patterns,
    },
    recommendedFollowUps,
    coachingModel: { source: 'llm' },
    generationDiagnostics: {
      startedAt: now,
      completedAt: new Date().toISOString(),
      totalMs: 0,
    },
    generatedAt: now,
    status: 'complete',
    languageCoachDebrief,
  }
}
