import { runSpeakLiveEvalChatCompletionRich } from '../ai/speakLiveEvalChatCompletion'
import { getReportEvalModelFast } from '../ai/config/aiProviderConfig'
import { AiTimeoutError } from '../ai/errors'

/**
 * Optional, fast LLM enrichment for `voiceWordCompareItems` whose `modelDutch` fell back to
 * the deterministic "Say this line again with a clearer 'X'" template. Azure pronunciation
 * scoring reports back what the learner SAID acoustically; if the spoken token doesn't
 * map cleanly to any logged coach correction or improved-phrasing pair, the deterministic
 * resolver echoes the (often misheard) word back verbatim — producing cards like:
 *
 *   WHAT YOU SAID  : "Ik heb gisteren gernen."
 *   AIM FOR DUTCH  : "Say this line again with a clearer 'gernen': 'Ik heb gisteren gernen.'"
 *
 * "gernen" is not a Dutch word. The learner almost certainly attempted "gerend" (past
 * participle of "rennen"). The user wants the report to be smart enough to infer that and
 * surface a real practice target.
 *
 * Implementation notes:
 *   - One batched LLM call across all "unresolved" weak-word rows (max 6) so we add at
 *     most ~1 round-trip to the report build, not N.
 *   - Strict per-call timeout + `maxRetries: 0` via `runSpeakLiveEvalChatCompletionRich`.
 *   - On any failure (timeout, parse error, schema mismatch) we return the original rows
 *     unchanged — the deterministic fallback continues to render. No defaults, no fake
 *     suggestions: a row is only enriched when the LLM gave us a concrete pair.
 *   - The LLM is asked for a STRICT structured JSON object so we never leak prose into
 *     the UI. Anything that doesn't parse is dropped.
 *
 * This is intentionally a separate module so it can be replaced/extended later (e.g.
 * batched per-conversation or moved into the Stage 2 deep enrichment pipeline) without
 * touching the deterministic Azure aggregator.
 */
export type LanguageCoachVoiceWordSemanticInput = {
  /** Word/syllable that Azure flagged as low-clarity in this turn. */
  weakWord: string
  /** Surrounding learner sentence (post-PA normalised). */
  contextLine: string
}

export type LanguageCoachVoiceWordSemanticSuggestion = {
  /** Input echo so callers can join back to the row that asked. */
  weakWord: string
  /**
   * `true` when the LLM judged the spoken token to be a recognisable Dutch word (just
   * acoustically weak). When true, callers SHOULD keep the original `weakWord` as the
   * focus chip and only swap in the corrected sentence + pronunciation tip.
   */
  isLikelyDutchWord: boolean
  /**
   * Best guess at what the learner actually tried to say, when `isLikelyDutchWord` is
   * false. `null` when the LLM couldn't make a confident guess (we DO NOT fabricate).
   */
  likelyIntent: {
    dutchWord: string
    englishGloss: string
  } | null
  /**
   * A clean Dutch sentence that uses the corrected word in the same context. `null`
   * when the LLM couldn't construct one confidently — callers fall back to the original
   * `modelDutch`.
   */
  correctedSentence: string | null
  /**
   * One-line pronunciation tip the UI surfaces under "Aim for this Dutch". Optional;
   * `null` when the LLM didn't have a specific tip beyond the corrected form itself.
   */
  pronunciationTip: string | null
}

export type LanguageCoachVoiceWordSemanticOutcome = {
  suggestions: LanguageCoachVoiceWordSemanticSuggestion[]
  diagnostics: {
    requested: number
    returned: number
    providerNetworkMs: number
    timedOut: boolean
    failureReason: string | null
  }
}

const SYSTEM_PROMPT = [
  'You are a Dutch-language pedagogy assistant. For each flagged "weakWord" from a learner\'s spoken sentence,',
  'reason about its grammatical slot in the sentence, then either confirm it is a real Dutch word that was',
  'simply spoken unclearly, or propose the most likely Dutch word the learner intended.',
  '',
  'Reasoning procedure (apply silently, do NOT include in output):',
  '  1. Look at what comes BEFORE the weakWord in the context line. Does the preceding context demand a',
  '     specific part-of-speech? Examples that constrain the slot:',
  '       - "Ik heb …" / "Ik ben …" / "We zijn …" → past participle (perfectum), usually ge-…-en / ge-…-d',
  '       - "Ik wil / kan / moet / ga …" → infinitive',
  '       - "de / het …" → noun',
  '       - "een …" → noun',
  '  2. If the weakWord SOUNDS LIKE a real Dutch word that fits that slot, propose THAT word, not a',
  '     phonetically-near word that breaks the grammar (e.g. for "Ik heb gisteren gernen.", the slot is a',
  '     past participle — propose "gerend" (ran), NOT "gisteren" which is already in the sentence and is',
  '     an adverb, not a participle).',
  '  3. Re-read your proposed `correctedSentence`. It MUST be grammatical Dutch and MUST NOT duplicate',
  '     any content word already in the context line. If the only sensible fit duplicates an existing word,',
  '     return likelyIntent = null and correctedSentence = null instead of producing nonsense.',
  '  4. If multiple Dutch words fit the slot and the audio is too ambiguous to pick one, prefer the most',
  '     common everyday verb for the perfectum slot (gedaan, gegeten, gegaan, gewerkt, gerend, gezien),',
  '     matching whichever shares the most syllables with the weakWord. Still apply rule 3.',
  '',
  'Output rules:',
  '- Reply with STRICT JSON only. No prose, no markdown, no leading commentary.',
  '- One entry per input weakWord, keyed by the input order via the `index` field.',
  '- `correctedSentence` MUST be natural Dutch and MUST NOT contain the same content word twice in a row',
  '  or in a way that breaks meaning. Keep it short (<= 90 chars). Lowercase except sentence start.',
  '- `pronunciationTip` is a single short English sentence aimed at the learner (<= 140 chars) describing',
  '  the actual sound / syllable difference between what was heard and what was meant. Null when no',
  '  specific tip applies. Avoid generic advice like "speak clearly".',
  '- `likelyIntent.englishGloss` is one English word or short phrase (<= 30 chars). Use the dictionary',
  '  meaning of the corrected Dutch word, not a translation of the whole sentence.',
  '- `isLikelyDutchWord` is true ONLY when the spoken token is unambiguously a real Dutch word that fits',
  '  the slot. In that case likelyIntent MUST be null. `correctedSentence` may still be a cleaner version',
  '  of the learner line if you have one (otherwise null — do NOT echo the learner line verbatim).',
  '- If your only candidate would create a duplicate-word sentence (rule 3), set BOTH likelyIntent and',
  '  correctedSentence to null. We prefer "no suggestion" over a nonsensical one.',
].join('\n')

function buildUserPrompt(inputs: LanguageCoachVoiceWordSemanticInput[]): string {
  const payload = inputs.map((row, i) => ({
    index: i,
    weakWord: row.weakWord.slice(0, 40),
    contextLine: row.contextLine.slice(0, 200),
  }))
  return [
    'Review these flagged Dutch-learner pronunciation slips and return a JSON object with the',
    'shape: { "suggestions": [ { "index": 0, "weakWord": "...", "isLikelyDutchWord": false,',
    '"likelyIntent": { "dutchWord": "...", "englishGloss": "..." } | null,',
    '"correctedSentence": "..." | null, "pronunciationTip": "..." | null }, ... ] }.',
    '',
    'Inputs:',
    JSON.stringify(payload),
  ].join('\n')
}

type RawSuggestion = {
  index?: number
  weakWord?: string
  isLikelyDutchWord?: boolean
  likelyIntent?: { dutchWord?: string; englishGloss?: string } | null
  correctedSentence?: string | null
  pronunciationTip?: string | null
}

function trimToMaxLen(value: string | null | undefined, max: number): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  if (t.length === 0) return null
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t
}

/**
 * Token-level normalisation for duplicate detection. Lowercases, strips punctuation/
 * diacritics, and splits on whitespace. Used by both the duplicate-word validator AND
 * the "intent word actually present in correctedSentence" check, so the two rules agree
 * on what counts as the "same word".
 */
function tokenizeForCompare(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Post-LLM sanity check on a proposed corrected sentence. Returns the sentence when it
 * passes all rules, or null when the LLM produced nonsense we should drop in favour of
 * the deterministic fallback. Rules (in order):
 *
 *   1. Non-empty after trim.
 *   2. NOT a verbatim echo of the learner line (no information added).
 *   3. NO content word appears more than once when it appeared at most once in the
 *      original. Catches the "Ik heb gisteren gernen" → "Ik heb gisteren gisteren" case
 *      where the LLM picks a substitute that's already in the sentence.
 *   4. When `intentWord` is provided, it MUST actually appear in the corrected sentence
 *      (the LLM is supposed to USE the intent — if it doesn't, the diagnosis ("Heard as
 *      X — likely Y") would contradict the practice target).
 *
 * Function words (de/het/een/en/of/maar/in/op/...) are exempt from rule 3 because their
 * repetition is grammatical, not a substitution bug.
 */
const DUPLICATE_CHECK_FUNCTION_WORDS = new Set([
  'de', 'het', 'een', 'en', 'of', 'maar', 'dat', 'die', 'in', 'op', 'met', 'voor', 'aan', 'van', 'bij',
  'naar', 'over', 'onder', 'tussen', 'tegen', 'zonder', 'ik', 'je', 'jij', 'hij', 'zij', 'wij', 'we',
  'jullie', 'ze', 'er', 'hier', 'daar', 'ben', 'bent', 'is', 'zijn', 'heb', 'hebt', 'heeft', 'hebben',
  'zou', 'zal', 'kan', 'wil', 'moet',
])
function validateCorrectedSentence(
  corrected: string | null,
  contextLine: string,
  intentWord: string | null,
): string | null {
  if (!corrected) return null
  const cleaned = corrected.trim()
  if (cleaned.length === 0) return null
  if (cleaned.toLowerCase() === contextLine.trim().toLowerCase()) return null

  const correctedTokens = tokenizeForCompare(cleaned)
  const contextTokens = tokenizeForCompare(contextLine)
  const contextCounts = new Map<string, number>()
  for (const t of contextTokens) contextCounts.set(t, (contextCounts.get(t) ?? 0) + 1)
  const correctedCounts = new Map<string, number>()
  for (const t of correctedTokens) correctedCounts.set(t, (correctedCounts.get(t) ?? 0) + 1)
  for (const [token, count] of correctedCounts) {
    if (count < 2) continue
    if (DUPLICATE_CHECK_FUNCTION_WORDS.has(token)) continue
    const originalCount = contextCounts.get(token) ?? 0
    if (count > originalCount) {
      /**
       * The LLM introduced a NEW duplicate of a content word ("gisteren gisteren") — drop.
       * If the learner already said the word twice, allow it (their intent).
       */
      return null
    }
  }

  if (intentWord) {
    const intentTokens = tokenizeForCompare(intentWord)
    if (intentTokens.length === 0) return null
    for (const tok of intentTokens) {
      if (!correctedTokens.includes(tok)) return null
    }
  }

  return cleaned
}

function parseSuggestions(
  raw: string,
  inputs: LanguageCoachVoiceWordSemanticInput[],
): LanguageCoachVoiceWordSemanticSuggestion[] {
  let parsed: { suggestions?: RawSuggestion[] } | null = null
  try {
    parsed = JSON.parse(raw) as { suggestions?: RawSuggestion[] }
  } catch {
    return []
  }
  const list = Array.isArray(parsed?.suggestions) ? parsed.suggestions : []
  const out: LanguageCoachVoiceWordSemanticSuggestion[] = []
  for (const row of list) {
    if (!row || typeof row !== 'object') continue
    const idx = typeof row.index === 'number' && row.index >= 0 && row.index < inputs.length ? row.index : -1
    if (idx < 0) continue
    const inputRow = inputs[idx]!
    const weakWord = typeof row.weakWord === 'string' && row.weakWord.trim() ? row.weakWord.trim() : inputRow.weakWord

    const isLikelyDutchWord = row.isLikelyDutchWord === true
    let likelyIntent: LanguageCoachVoiceWordSemanticSuggestion['likelyIntent'] = null
    if (
      !isLikelyDutchWord &&
      row.likelyIntent &&
      typeof row.likelyIntent === 'object' &&
      typeof row.likelyIntent.dutchWord === 'string' &&
      row.likelyIntent.dutchWord.trim().length > 0
    ) {
      likelyIntent = {
        dutchWord: row.likelyIntent.dutchWord.trim().slice(0, 40),
        englishGloss:
          typeof row.likelyIntent.englishGloss === 'string' && row.likelyIntent.englishGloss.trim()
            ? row.likelyIntent.englishGloss.trim().slice(0, 60)
            : '',
      }
    }

    /**
     * Validate the corrected sentence against the original context. When the LLM proposes
     * a substitution that would create a duplicate-word sentence (e.g. "Ik heb gisteren
     * gisteren.") OR proposes a sentence that doesn't actually contain the intent word,
     * drop the corrected sentence entirely. We DO keep the `likelyIntent` if it was sane
     * on its own, but the row falls back to the deterministic resolver downstream because
     * `mergeVoiceWordSuggestion` requires correctedSentence to be non-null.
     */
    const rawCorrected = trimToMaxLen(row.correctedSentence ?? null, 200)
    const validatedCorrected = validateCorrectedSentence(
      rawCorrected,
      inputRow.contextLine,
      likelyIntent?.dutchWord ?? null,
    )

    out.push({
      weakWord,
      isLikelyDutchWord,
      likelyIntent,
      correctedSentence: validatedCorrected,
      pronunciationTip: trimToMaxLen(row.pronunciationTip ?? null, 200),
    })
  }
  return out
}

/**
 * Single-batch LLM enrichment. Returns suggestions in the same order as input items
 * (best-effort — missing indices are simply absent and callers fall back to deterministic
 * resolution for those rows). The result is structural (no UI strings); a frontend / debrief
 * builder is responsible for composing the user-facing copy.
 *
 * Honours a per-call timeout (`requestTimeoutMs`) and the production-fast model.
 */
export async function enrichVoiceWordSemantics(
  inputs: LanguageCoachVoiceWordSemanticInput[],
  options?: { requestTimeoutMs?: number },
): Promise<LanguageCoachVoiceWordSemanticOutcome> {
  if (inputs.length === 0) {
    return {
      suggestions: [],
      diagnostics: { requested: 0, returned: 0, providerNetworkMs: 0, timedOut: false, failureReason: null },
    }
  }
  const requestTimeoutMs = options?.requestTimeoutMs ?? 4500
  const userPrompt = buildUserPrompt(inputs)
  try {
    const r = await runSpeakLiveEvalChatCompletionRich({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      maxOutputTokens: 600,
      temperature: 0,
      jsonResponseFormat: true,
      openAiModel: getReportEvalModelFast(),
      requestTimeoutMs,
    })
    const suggestions = parseSuggestions(r.content, inputs)
    return {
      suggestions,
      diagnostics: {
        requested: inputs.length,
        returned: suggestions.length,
        providerNetworkMs: r.providerNetworkMs,
        timedOut: false,
        failureReason: null,
      },
    }
  } catch (e) {
    const timedOut = e instanceof AiTimeoutError
    const failureReason =
      e instanceof Error ? `${timedOut ? 'timeout' : e.name}: ${e.message.slice(0, 120)}` : 'unknown_error'
    console.warn('[languageCoachVoiceWordSemanticEnricher] enrichment failed', { failureReason, timedOut })
    return {
      suggestions: [],
      diagnostics: {
        requested: inputs.length,
        returned: 0,
        providerNetworkMs: 0,
        timedOut,
        failureReason,
      },
    }
  }
}
