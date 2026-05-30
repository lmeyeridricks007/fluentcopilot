import { z } from 'zod'
import type {
  AIResponseEnvelope,
  AssistantReplyEnvelope,
  ConversationSummary,
  TrainTurnResponse,
  TurnEnrichmentEnvelope,
} from '../../../models/contracts'
import { AiValidationError } from '../errors'
import type { SpeakLiveSignals } from '../../../domain/speakLive/speakLiveFsm'
import { stripAssistantMarkdownForTts } from '../../../domain/speakLive/stripAssistantMarkdownForTts'

const FeedbackZ = z
  .object({
    category: z.string(),
    originalText: z.string(),
    correctedText: z.string(),
    explanation: z.string(),
    severity: z.string().optional(),
  })
  .nullable()
  .optional()

export const TurnEnvelopeZ = z.object({
  assistantReply: z.string(),
  feedback: FeedbackZ,
  saveWordCandidates: z.array(z.string()).default([]),
  scenarioProgress: z
    .object({ stage: z.string(), notes: z.string().optional() })
    .nullable()
    .optional(),
  shouldConversationEnd: z.boolean().default(false),
  updatedSummary: z.string(),
})

const SpeakLivePhaseZ = z.enum(['greeting', 'intent_detection', 'clarification', 'execution', 'closing'])
const SpeakLiveSignalsBodyZ = z
  .object({
    nextPhase: SpeakLivePhaseZ.optional(),
    intentLabel: z.string().max(200).optional(),
    needsClarification: z.boolean().optional(),
    goalIndexesCompleted: z.array(z.number().int().nonnegative()).optional(),
    advancePrimaryGoal: z.boolean().optional(),
    readyForClosing: z.boolean().optional(),
    rollingSummaryEnglish: z.string().max(4000).optional(),
  })
  .strict()

const TrainTurnResponseZ = z.object({
  answeredGoals: z.array(z.string()).default([]),
  unresolvedGoals: z.array(z.string()).default([]),
  nextLikelyGoal: z.string().nullable().optional(),
  newGoalSuggestions: z.array(z.string()).max(12).optional(),
  followUpIntentOptional: z.string().max(400).nullable().optional(),
  coachNotesOptional: z.string().max(1200).optional(),
})

const ReplyOnlyZ = z.object({
  assistantReply: z.string(),
  scenarioProgress: z
    .object({ stage: z.string(), notes: z.string().optional() })
    .nullable()
    .optional(),
  shouldConversationEnd: z.boolean().default(false),
  speakLiveSignals: SpeakLiveSignalsBodyZ.nullable().optional(),
  trainTurnResponse: TrainTurnResponseZ.nullable().optional(),
})

/** Accept assistantMessage as alias for assistantReply (product / model drift). */
function normalizeReplyOnlyShape(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object') return parsed
  const p = parsed as Record<string, unknown>
  if (typeof p.assistantMessage === 'string' && typeof p.assistantReply !== 'string') {
    return { ...p, assistantReply: p.assistantMessage }
  }
  /**
   * Some completions return the reply with a different key (`reply`, `text`, `message`, etc.) —
   * still recoverable. We only do this when `assistantReply` is missing AND exactly one of these
   * candidate keys carries a usable string, so we never mis-pick when the model returned a real
   * envelope with multiple fields.
   */
  if (typeof p.assistantReply !== 'string') {
    for (const k of ['reply', 'text', 'message', 'content', 'response'] as const) {
      const v = p[k]
      if (typeof v === 'string' && v.trim().length > 0) {
        return { ...p, assistantReply: v }
      }
    }
  }
  return parsed
}

/**
 * Best-effort salvage for reply-only responses where `JSON.parse` failed (or where the model
 * returned bare prose / markdown despite `response_format: 'json_object'`). Used by both the
 * coach-style scenarios (e.g. Language Coach) and the live-speak ultra-lean path.
 *
 * Strategies tried, in order:
 *   1. Strip `\`\`\`json … \`\`\`` fences, retry parse.
 *   2. Locate the first `{` and last `}`, slice, retry parse — recovers from leading/trailing prose.
 *   2b. Extract the first reply-bearing string field from a TRUNCATED JSON envelope — recovers
 *       from `max_tokens` cut-offs where `{"assistantReply":"…mid-sentence` never gets its
 *       closing `"`. Without this, the language coach's teaching replies (which routinely
 *       brush the cap) fall through to `AiValidationError → "Quick reconnect"` despite the
 *       model having produced a perfectly readable Dutch reply.
 *   3. Treat the whole body as the assistant reply text and synthesize a minimal envelope.
 *
 * Returns `null` only when the raw is empty/whitespace — caller surfaces a hard failure for that.
 */
export function salvageReplyOnlyRaw(raw: string): unknown | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  /** Strategy 1: strip code fences. */
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  if (unfenced && unfenced !== trimmed) {
    try {
      return JSON.parse(unfenced) as unknown
    } catch {
      /** fall through */
    }
  }

  /** Strategy 2: extract the first balanced-ish JSON object. */
  const firstBrace = unfenced.indexOf('{')
  const lastBrace = unfenced.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const slice = unfenced.slice(firstBrace, lastBrace + 1)
    try {
      return JSON.parse(slice) as unknown
    } catch {
      /** fall through */
    }
  }

  /** Strategy 2b: salvage a truncated JSON envelope's reply field. */
  if (firstBrace >= 0) {
    const partialReply = extractFirstStringFieldFromTruncatedJson(unfenced.slice(firstBrace), [
      'assistantReply',
      'assistantText',
      'reply',
      'text',
      'message',
      'content',
      'response',
    ])
    if (partialReply && partialReply.length > 0) {
      return { assistantReply: partialReply }
    }
  }

  /**
   * Strategy 3: bare-text salvage — this is the actual user-reported failure mode.
   * `gpt-4o-mini` occasionally ignores `response_format: json_object` for the language-coach
   * prompt and emits the Dutch reply as plain prose. Wrapping it as `assistantReply` keeps the
   * conversation alive instead of surfacing the "Small hiccup" banner. We strip any leftover
   * leading `{` / `assistantReply:` echo so the salvaged text reads naturally on screen.
   */
  const looksJsonish = /^[\s{[]/.test(unfenced)
  if (!looksJsonish || (firstBrace < 0 && lastBrace < 0)) {
    const cleaned = unfenced.replace(/^["']+|["']+$/g, '').trim()
    if (cleaned.length > 0) {
      return { assistantReply: cleaned }
    }
  }
  return null
}

/**
 * Walks a truncated JSON object body (must start with `{`) and pulls the first value of any
 * key in `candidateKeys`, even when the string is missing its closing `"`. Handles standard
 * JSON escapes (`\\"`, `\\n`, `\\t`, `\\\\`, `\\/`, `\\u00XX`). When the string IS terminated
 * cleanly we still return its content — the field is then up to the regular JSON.parse path
 * to handle, but a salvage hit here is harmless and lets the recovery succeed even when the
 * surrounding envelope is still malformed (e.g. missing the trailing `}`).
 *
 * Returns null when no candidate key matches or when the captured text trims to empty.
 */
function extractFirstStringFieldFromTruncatedJson(body: string, candidateKeys: readonly string[]): string | null {
  if (!body.startsWith('{')) return null
  /** Build one alternation regex over the candidate keys; the value-open is `"<key>"\s*:\s*"`. */
  const keysAlt = candidateKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const opener = new RegExp(`"(${keysAlt})"\\s*:\\s*"`, 'g')
  const m = opener.exec(body)
  if (!m) return null
  const startIdx = opener.lastIndex
  let i = startIdx
  let buf = ''
  while (i < body.length) {
    const ch = body[i]
    if (ch === '\\') {
      const next = body[i + 1]
      if (next === undefined) break /** truncated mid-escape — drop it cleanly */
      switch (next) {
        case '"':
          buf += '"'
          i += 2
          continue
        case '\\':
          buf += '\\'
          i += 2
          continue
        case '/':
          buf += '/'
          i += 2
          continue
        case 'n':
          buf += '\n'
          i += 2
          continue
        case 't':
          buf += '\t'
          i += 2
          continue
        case 'r':
          buf += '\r'
          i += 2
          continue
        case 'b':
          buf += '\b'
          i += 2
          continue
        case 'f':
          buf += '\f'
          i += 2
          continue
        case 'u': {
          /** `\uXXXX` — require 4 hex digits, otherwise treat the remainder as truncated. */
          if (i + 6 > body.length) {
            i = body.length
            break
          }
          const hex = body.slice(i + 2, i + 6)
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
            i = body.length
            break
          }
          buf += String.fromCharCode(Number.parseInt(hex, 16))
          i += 6
          continue
        }
        default:
          /** Unknown escape — keep the next char verbatim and move on. */
          buf += next
          i += 2
          continue
      }
    }
    if (ch === '"') {
      /** Clean close — we have the full value. */
      break
    }
    buf += ch
    i += 1
  }
  /**
   * If we ran off the end without seeing the closing quote, the LAST captured chunk is
   * almost certainly a half-word. Trim back to the last whitespace boundary so the reply
   * reads naturally on screen (Dutch learners shouldn't see "Probeer ").
   */
  const closedCleanly = i < body.length && body[i] === '"'
  let salvaged = buf
  if (!closedCleanly) {
    const lastWs = Math.max(salvaged.lastIndexOf(' '), salvaged.lastIndexOf('\n'), salvaged.lastIndexOf('\t'))
    if (lastWs > 0) salvaged = salvaged.slice(0, lastWs)
    salvaged = salvaged.replace(/[\s\u00A0]+$/u, '')
    /** If the trailing fragment ended in mid-sentence (no punctuation), an ellipsis hints at the cut. */
    if (salvaged.length > 0 && !/[.!?…]$/.test(salvaged)) {
      salvaged = `${salvaged}…`
    }
  }
  const out = salvaged.trim()
  return out.length > 0 ? out : null
}

const EnrichmentZ = z.object({
  feedback: FeedbackZ,
  saveWordCandidates: z.array(z.string()).default([]),
  updatedSummary: z.string(),
  scenarioProgress: z
    .object({ stage: z.string(), notes: z.string().optional() })
    .nullable()
    .optional(),
  evaluation: z.record(z.string(), z.unknown()).nullable().optional(),
})

const RecapZ = z.object({
  whatWentWell: z.array(z.string()).default([]),
  whatToImprove: z.array(z.string()).default([]),
  correctedPhrases: z
    .array(
      z.object({
        original: z.string(),
        corrected: z.string(),
        note: z.string(),
      })
    )
    .default([]),
  /** Legacy / primary next-step string (either this or recommendedNextStep should be set). */
  suggestedNextAction: z.string().optional(),
  recommendedNextStep: z.string().optional(),
  saveWordCandidates: z.array(z.string()).default([]),
  /** Alias merged into saveWordCandidates after validation. */
  savedWordSuggestions: z.array(z.string()).optional(),
  pronunciationHighlights: z
    .array(
      z.object({
        phrase: z.string(),
        tip: z.string(),
      })
    )
    .default([]),
  goalsCompleted: z.array(z.string()).default([]),
  goalsMissed: z.array(z.string()).default([]),
  languageNotes: z.array(z.string()).default([]),
  transcriptEvidence: z
    .array(
      z.object({
        goalId: z.string(),
        quote: z.string(),
      })
    )
    .default([]),
  dutchUpgrade: z.array(z.string()).optional(),
})

const LiveSpeakUltraReplyZ = z
  .object({
    assistantText: z.string().optional(),
    assistantReply: z.string().optional(),
    /** Micro-LLM contract: compact goal markers (indices as "0" or train ids). Models sometimes return numbers. */
    goalHit: z.array(z.union([z.string(), z.number()]).transform((v) => String(v)).pipe(z.string().max(80))).max(8).optional(),
    answeredGoals: z.array(z.number().int().nonnegative()).max(12).optional().default([]),
    trainAnsweredGoalIds: z.array(z.string().max(80)).max(12).optional(),
    detectedUserIntentOptional: z.string().max(200).nullable().optional(),
    pendingGoalsOptional: z.array(z.string().max(160)).max(6).optional(),
  })
  .strict()

/**
 * Maps the ultra-lean live JSON contract into the standard reply-only envelope
 * so persistence / FSM code paths stay unchanged.
 */
export function validateAndMapLiveSpeakReplyJson(
  raw: string,
  ctx: { activeGoalIndex: number }
): AssistantReplyEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    /**
     * Live Speak ultra-lean replies occasionally come back as bare Dutch prose despite
     * `response_format: 'json_object'`. Salvage by treating the body as `assistantText` so the
     * conversation continues — goal hits / intent are unavailable in that case but the user
     * still hears a reply instead of "Small hiccup". (See {@link salvageReplyOnlyRaw}.)
     */
    const salvaged = salvageReplyOnlyRaw(raw)
    if (salvaged === null) {
      throw new AiValidationError('LLM returned non-JSON for live Speak reply')
    }
    /** Promote `assistantReply` → `assistantText` (the live schema's preferred key). */
    if (salvaged && typeof salvaged === 'object') {
      const s = salvaged as Record<string, unknown>
      if (typeof s.assistantReply === 'string' && typeof s.assistantText !== 'string') {
        s.assistantText = s.assistantReply
      }
    }
    parsed = salvaged
  }
  const r = LiveSpeakUltraReplyZ.safeParse(parsed)
  if (!r.success) {
    throw new AiValidationError(`Invalid live Speak reply: ${r.error.message}`)
  }
  const v = r.data
  let text = stripAssistantMarkdownForTts((v.assistantText ?? v.assistantReply ?? '').trim())
  if (!text) {
    throw new AiValidationError('Live Speak reply missing assistantText')
  }
  // Models sometimes echo the old JSON example placeholder literally.
  if (/^<dutch>$/i.test(text) || /^<[^>]*dutch[^>]*>$/i.test(text)) {
    throw new AiValidationError('Live Speak reply used a placeholder instead of Dutch text')
  }

  const answeredFromGoalHit: number[] = []
  const trainIdsFromGoalHit: string[] = []
  for (const h of v.goalHit ?? []) {
    const t = h.trim()
    if (!t) continue
    if (/^\d+$/.test(t)) answeredFromGoalHit.push(parseInt(t, 10))
    else trainIdsFromGoalHit.push(t)
  }
  const answered = [...new Set([...(v.answeredGoals ?? []), ...answeredFromGoalHit])].filter(
    (n) => Number.isFinite(n) && n >= 0 && n < 128
  )
  const trainIdsMerged = [...new Set([...(v.trainAnsweredGoalIds ?? []), ...trainIdsFromGoalHit])]

  const idx = Math.max(0, Math.floor(ctx.activeGoalIndex))
  const advancePrimaryGoal = answered.includes(idx) || answered.length > 0 || trainIdsMerged.length > 0

  const rollParts = [v.detectedUserIntentOptional?.trim(), ...(v.pendingGoalsOptional ?? [])].filter(Boolean) as string[]
  const rolling = rollParts.join(' · ').slice(0, 400)

  const speakLiveSignals: SpeakLiveSignals = {
    intentLabel: v.detectedUserIntentOptional?.trim() || undefined,
    goalIndexesCompleted: answered.length ? answered : undefined,
    advancePrimaryGoal: advancePrimaryGoal ? true : undefined,
    needsClarification: (v.pendingGoalsOptional?.length ?? 0) > 0 ? true : undefined,
    rollingSummaryEnglish: rolling.length ? rolling : undefined,
  }

  const trainTurnResponse =
    trainIdsMerged.length > 0
      ? {
          answeredGoals: trainIdsMerged,
          unresolvedGoals: [] as string[],
          nextLikelyGoal: null as string | null,
          newGoalSuggestions: undefined,
          followUpIntentOptional: null as string | null,
          coachNotesOptional: undefined,
        }
      : null

  return {
    assistantReply: text,
    scenarioProgress: null,
    shouldConversationEnd: false,
    speakLiveSignals,
    trainTurnResponse,
  }
}

export function validateAndMapReplyOnlyJson(raw: string): AssistantReplyEnvelope {
  let parsed: unknown
  let salvaged = false
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    parsed = salvageReplyOnlyRaw(raw)
    if (parsed === null) {
      throw new AiValidationError('LLM returned non-JSON for reply-only turn')
    }
    salvaged = true
  }
  parsed = normalizeReplyOnlyShape(parsed)
  let r = ReplyOnlyZ.safeParse(parsed)
  /** Schema validation can also fail when JSON.parse succeeded but the model omitted required keys. */
  if (!r.success && !salvaged) {
    const retry = salvageReplyOnlyRaw(raw)
    if (retry !== null) {
      r = ReplyOnlyZ.safeParse(normalizeReplyOnlyShape(retry))
      if (r.success) salvaged = true
    }
  }
  if (!r.success) {
    throw new AiValidationError(`Invalid reply-only envelope: ${r.error.message}`)
  }
  const v = r.data
  const trainTurnResponse: TrainTurnResponse | null = v.trainTurnResponse
    ? {
        answeredGoals: v.trainTurnResponse.answeredGoals ?? [],
        unresolvedGoals: v.trainTurnResponse.unresolvedGoals ?? [],
        nextLikelyGoal: v.trainTurnResponse.nextLikelyGoal ?? null,
        newGoalSuggestions: v.trainTurnResponse.newGoalSuggestions,
        followUpIntentOptional: v.trainTurnResponse.followUpIntentOptional ?? null,
        coachNotesOptional: v.trainTurnResponse.coachNotesOptional,
      }
    : null
  return {
    assistantReply: stripAssistantMarkdownForTts(v.assistantReply),
    scenarioProgress: v.scenarioProgress ?? null,
    shouldConversationEnd: v.shouldConversationEnd,
    speakLiveSignals: v.speakLiveSignals ?? null,
    trainTurnResponse,
  }
}

export function validateAndMapEnrichmentJson(raw: string): TurnEnrichmentEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    throw new AiValidationError('LLM returned non-JSON for enrichment')
  }
  const r = EnrichmentZ.safeParse(parsed)
  if (!r.success) {
    throw new AiValidationError(`Invalid enrichment envelope: ${r.error.message}`)
  }
  const v = r.data
  const fb = v.feedback
  return {
    feedback: fb
      ? {
          ...fb,
          severity: fb.severity ?? 'info',
        }
      : null,
    saveWordCandidates: v.saveWordCandidates,
    updatedSummary: v.updatedSummary,
    scenarioProgress: v.scenarioProgress ?? null,
    evaluation: v.evaluation ?? null,
  }
}

/** Parse and validate turn JSON into domain `AIResponseEnvelope`. */
export function validateAndMapTurnJson(raw: string): AIResponseEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    throw new AiValidationError('LLM returned non-JSON for turn')
  }
  const r = TurnEnvelopeZ.safeParse(parsed)
  if (!r.success) {
    throw new AiValidationError(`Invalid turn envelope: ${r.error.message}`)
  }
  const v = r.data
  const fb = v.feedback
  return {
    assistantReply: v.assistantReply,
    feedback: fb
      ? {
          ...fb,
          severity: fb.severity ?? 'info',
        }
      : null,
    saveWordCandidates: v.saveWordCandidates,
    scenarioProgress: v.scenarioProgress ?? null,
    shouldConversationEnd: v.shouldConversationEnd,
    updatedSummary: v.updatedSummary,
  }
}

/** Parse and validate recap JSON into domain `ConversationSummary`. */
export function validateAndMapRecapJson(raw: string, threadId: string): ConversationSummary {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    throw new AiValidationError('LLM returned non-JSON for recap')
  }
  const r = RecapZ.safeParse(parsed)
  if (!r.success) {
    throw new AiValidationError(`Invalid recap envelope: ${r.error.message}`)
  }
  const d = r.data
  const suggested =
    (typeof d.suggestedNextAction === 'string' ? d.suggestedNextAction.trim() : '') ||
    (typeof d.recommendedNextStep === 'string' ? d.recommendedNextStep.trim() : '') ||
    'Practice again soon.'
  const saveWordCandidates = [...new Set([...d.saveWordCandidates, ...(d.savedWordSuggestions ?? [])])].slice(0, 16)
  const pronunciationHighlights = d.pronunciationHighlights?.length ? d.pronunciationHighlights : []
  const goalsCompleted = d.goalsCompleted?.length ? d.goalsCompleted : undefined
  const goalsMissed = d.goalsMissed?.length ? d.goalsMissed : undefined
  const languageNotes = d.languageNotes?.length ? d.languageNotes : undefined
  const transcriptEvidence = d.transcriptEvidence?.length ? d.transcriptEvidence : undefined
  const dutchUpgrade = d.dutchUpgrade?.length ? d.dutchUpgrade : languageNotes

  return {
    threadId,
    whatWentWell: d.whatWentWell,
    whatToImprove: d.whatToImprove,
    correctedPhrases: d.correctedPhrases,
    suggestedNextAction: suggested,
    recommendedNextStep: d.recommendedNextStep?.trim() || suggested,
    saveWordCandidates,
    pronunciationHighlights,
    goalsCompleted,
    goalsMissed,
    languageNotes,
    transcriptEvidence,
    dutchUpgrade,
  }
}

/** Soft fallback recap when validation fails (product safety). */
export function fallbackRecapSummary(threadId: string): ConversationSummary {
  return {
    threadId,
    whatWentWell: ['You completed a conversation turn.'],
    whatToImprove: [],
    correctedPhrases: [],
    suggestedNextAction: 'Practice again soon.',
    recommendedNextStep: 'Practice again soon.',
    saveWordCandidates: [],
    pronunciationHighlights: [],
    goalsCompleted: [],
    goalsMissed: [],
    languageNotes: [],
    transcriptEvidence: [],
    dutchUpgrade: [],
  }
}
