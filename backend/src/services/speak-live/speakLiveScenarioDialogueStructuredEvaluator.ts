/**
 * Single-call structured OpenAI evaluator for the optimized scenario voice report lane.
 *
 * Two modes are supported:
 * - **fast** (default, sync production path): emits a {@link FastScenarioEvaluationOutput}, capped at
 *   ~700–900 output tokens. Used by the synchronous report flow so the learner sees their report
 *   quickly. The mapper lifts the fast envelope into the legacy
 *   {@link ScenarioDialogueStructuredOutput} shape so existing UI sections render unchanged.
 * - **deep** (optional, async-only): emits the full {@link ScenarioDialogueStructuredOutput} with
 *   verbose CEFR reasoning, advanced drills, and richer per-turn coaching. Reserved for the
 *   {@link isReportDeepEnrichmentEnabled} background pass — NEVER blocks the initial report.
 *
 * Diagnostics are decomposed into {@link SpeakLiveOpenAiEvaluationDiagnosticsV1} so ops can separate
 * provider wall time from prompt construction, JSON parsing, schema validation, and JSON repair.
 */
import type { ConversationMessage } from '../../models/contracts'
import {
  computeReportEvalMaxOutputTokensFastForTurns,
  getReportEvalFastModelDiagnosticsLabel,
  getReportEvalFastRequestTimeoutMs,
  getReportEvalMaxOutputTokensDeep,
  getReportEvalMaxOutputTokensFast,
  getReportEvalModelDeep,
  getReportEvalModelFast,
  getSpeakLiveStructuredEvalModelDiagnosticsLabel,
  speakLiveEvalCredentialsReady,
} from '../ai/config/aiProviderConfig'
import {
  runSpeakLiveEvalChatCompletionRich,
  type RunSpeakLiveEvalChatCompletionResult,
} from '../ai/speakLiveEvalChatCompletion'
import type { LiveEvalLlmSession, LiveEvalLlmTurnInput } from './liveSessionEvaluationLlm'
import { LiveEvalLlmSessionSchema } from './liveSessionEvaluationLlm'
import { mapScenarioDialogueStructuredToLiveEvalLlmSession } from './speakLiveScenarioDialogueStructuredMapper'
import {
  DeepScenarioEvaluationSchema,
  FastScenarioEvaluationSchema,
  ScenarioDialogueStructuredOutputSchema,
  liftFastToDeepScenarioEvaluation,
  type FastScenarioEvaluationOutput,
  type ScenarioDialogueStructuredOutput,
} from './speakLiveScenarioDialogueStructured.schema'
import { repairScenarioDialogueStructuredJson } from './speakLiveScenarioDialogueStructuredRepair'
import type { SpeakLiveOpenAiEvaluationDiagnosticsV1 } from './liveVoiceEvaluationTypes'

export type ScenarioDialogueEvaluationMode = 'fast' | 'deep'

const FAST_SYSTEM_PROMPT = `You score Dutch scenario role-play transcripts for FluentCopilot. Return ONE JSON object only — no markdown, no code fences, no commentary, no prose narrative.

JSON contract (FAST):
{
  "overall": { summary, scenarioOutcomeScore, taskCompletionScore, languageScore, conversationFlowScore, grammarScore, vocabularyScore, naturalnessScore, estimatedLevel, confidence, primaryFocus:{title,why,pattern,example} },
  "goals": [{ goalId, title, weight, status, score }],
  "turns": [{ turnId, languageScores:{grammar,vocabulary,sentenceStructure,naturalness,taskRelevance}, mainFix, strengths, improvements, correctedLine, strongerNaturalLine }],
  "recommendations": { nextDrillTitle, nextDrillReason, suggestedPracticeType }
}

Hard rules (NO exceptions — violating these wastes output tokens and gets your reply truncated):
- Score ONLY user turns. \`turns\` must contain exactly one row per user line, in the same order as \`userTurnIdsOrdered\`. Assistant lines are context only — never put assistant turnIds in \`turns\`.
- Each \`turns[i].turnId\` MUST equal \`userTurnIdsOrdered[i]\` exactly. Copy character-for-character.
- All scores are integers 0–100. \`weight\` is 0–1. \`estimatedLevel\` is one of A1|A2|B1|B2.
- Wrong Dutch word with inferable meaning: infer the intended Dutch and put it in \`correctedLine\` / \`strongerNaturalLine\`.
- \`mainFix\` must be concrete and turn-specific; never output filler like "Cover this scenario goal."
- Do NOT inflate scores for broken Dutch. A1/A2 reward clear simple communication but still flag wrong words and broken syntax.
- Do NOT repeat explanations across fields. Do NOT include long coaching paragraphs, examples beyond the two arrays, or markdown.

Allowed enum values — you MUST use exactly these strings, no synonyms, no descriptions:
- \`overall.estimatedLevel\` ∈ { "A1", "A2", "B1", "B2" }.
- \`goals[*].status\` ∈ { "completed", "partially_completed", "missed" }. Do NOT write "achieved", "done", "success", "not achieved", "failed", "in progress", "partial", or any other word — pick exactly one of the three allowed strings.
- \`recommendations.suggestedPracticeType\` ∈ { "scenario_retry", "word_drill", "sentence_drill", "coach", "read_aloud", "listening" }. This field is the KEYWORD ONLY (e.g. "word_drill"). The reason / description goes in \`nextDrillReason\`. Never put a sentence here.

Strict character budgets per field — exceeding them risks truncation:
- overall.summary ≤ 220 chars (≤ 2 short sentences).
- overall.primaryFocus.{title ≤ 70, why ≤ 140, pattern ≤ 70, example ≤ 140}.
- goals[*].title ≤ 110 chars.
- turns[*].mainFix ≤ 140 chars (1 sentence).
- turns[*].strengths and turns[*].improvements: ≤ 2 entries each, ≤ 110 chars per entry.
- turns[*].correctedLine ≤ 160 chars; turns[*].strongerNaturalLine ≤ 160 chars.
- recommendations.nextDrillTitle ≤ 100 chars; recommendations.nextDrillReason ≤ 180 chars.
If you can say it in fewer chars, do.`

const DEEP_SYSTEM_PROMPT = `You evaluate Dutch scenario role-play transcripts. Return JSON only — one object, no markdown, no code fences, no commentary.

Hard rules:
- Score ONLY user turns. The "turns" array must contain exactly one evaluation per user line, in the same order as userTurnIdsOrdered. Assistant lines are context only — never put assistant turnIds in "turns".
- Each turns[i].turnId MUST equal userTurnIdsOrdered[i] **exactly** (same string, same hyphens). Copy-paste the UUID; never shorten, merge, or reformat hex segments.
- overall.primaryFocus MUST be a JSON object with keys title, why, pattern, example (each a string). Never return primaryFocus as a single prose string.
- All numeric scores are integers 0–100. Do not inflate scores for broken Dutch. A1/A2: reward clear simple communication but still flag wrong words and broken syntax. B1: expect fuller replies, follow-ups, smoother structure.
- Goal status and evidence must come from user speech only.
- If meaning is clear but Dutch is unnatural: taskRelevance higher than naturalness.
- Wrong Dutch word with inferable meaning: infer the intended Dutch from scenario + assistant context and write that in correctedLine/strongerNaturalLine.
- mainFix must be concrete and turn-specific; never output generic filler like "Cover this scenario goal."
- Keep strings concise (no long essays).`

/** Backwards-compat export: the legacy SYSTEM_PROMPT name used to point at the deep prompt. */
export const SYSTEM_PROMPT = DEEP_SYSTEM_PROMPT

export type ScenarioDialogueStructuredEvalInput = {
  scenarioId: string
  scenarioName: string
  scenarioType: string
  level: string
  goals: Array<{ goalId: string; title: string; weight: number }>
  dialogueTurns: Array<{
    turnId: string
    speaker: 'assistant' | 'user'
    text: string
    durationMs?: number | null
  }>
  recapHints?: {
    goalsCompleted: string[]
    goalsMissed: string[]
    whatWentWell: string[]
    whatToImprove: string[]
  }
  previousWeakAreas?: string[]
}

export type ScenarioDialogueStructuredEvalDiagnostics = {
  promptCharCount: number
  approximateInputTokens: number
  approximateOutputTokens: number
  structuredLlmMs: number
  modelName: string
  validationMs: number
  validationErrors: string[]
}

export type EvaluateScenarioDialogueStructuredOk = {
  ok: true
  data: LiveEvalLlmSession
  structured: ScenarioDialogueStructuredOutput
  raw: string
  diagnostics: ScenarioDialogueStructuredEvalDiagnostics
  openaiDiagnostics: SpeakLiveOpenAiEvaluationDiagnosticsV1
  repairAttempted: boolean
  chatMs: number
  repairMs: number
  schemaName: 'fast' | 'deep'
}

export type EvaluateScenarioDialogueStructuredFail = {
  ok: false
  reason: string
  raw?: string
  diagnostics: ScenarioDialogueStructuredEvalDiagnostics
  openaiDiagnostics: SpeakLiveOpenAiEvaluationDiagnosticsV1
  repairAttempted: boolean
  chatMs: number
  repairMs: number
  schemaName: 'fast' | 'deep'
}

export type EvaluateScenarioDialogueStructuredResult =
  | EvaluateScenarioDialogueStructuredOk
  | EvaluateScenarioDialogueStructuredFail

/** ~4 chars per token heuristic (English/Dutch mix). */
export function estimateApproximateTokensFromChars(charCount: number): number {
  return Math.max(0, Math.round(charCount / 4))
}

function trunc(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function stripJsonFences(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
}

function parseJsonLoose(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(stripJsonFences(raw)) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'json_parse_error' }
  }
}

/**
 * Best-effort structural JSON salvage for OpenAI completions truncated at the model's
 * `max_output_tokens` ceiling (`finish_reason: "length"`).
 *
 * No LLM round-trip — we walk the raw text once with a small state machine that tracks "are we
 * structurally complete right here?". Only positions that follow a *complete value* (closed
 * string-value, closed object/array, or closed primitive literal at a delimiter) are recorded
 * as salvage points. Object keys that have not yet been paired with a value DO NOT count — that
 * was the bug in the previous implementation.
 *
 * After locating the last safe position we:
 * 1. Truncate to that position.
 * 2. Strip any trailing `,` / whitespace.
 * 3. Append the matching `]` / `}` characters in reverse-container-stack order.
 *
 * The salvaged JSON is still validated against the full Zod schema downstream — if a required
 * field was lost in the truncated tail, validation fails cleanly and the deterministic fallback
 * takes over.
 *
 * Exported for unit tests.
 */
export function salvageTruncatedJson(raw: string): string | null {
  const stripped = stripJsonFences(raw)
  if (!stripped) return null

  type Container = { type: 'object' | 'array'; expecting: 'key' | 'colon' | 'value' | 'comma' }
  const stack: Container[] = []
  let topDone = false

  let inString = false
  let escapeNext = false
  let stringStart = -1
  let primitiveStart = -1

  let lastSafeIndex = -1
  let lastSafeStackTypes: Array<'object' | 'array'> = []

  const markSafeAtComplete = (pos: number) => {
    lastSafeIndex = pos
    lastSafeStackTypes = stack.map((s) => s.type)
  }

  /**
   * Called when a complete value has just been consumed (string-as-value, primitive literal,
   * or a closed nested container). Updates the parent container's expecting state and marks
   * this position as a safe salvage point.
   */
  const onCompleteValue = (pos: number) => {
    if (stack.length === 0) {
      topDone = true
      markSafeAtComplete(pos)
      return
    }
    const top = stack[stack.length - 1]!
    top.expecting = 'comma'
    markSafeAtComplete(pos)
  }

  /** Flush a pending primitive literal (number/true/false/null) when we hit a delimiter. */
  const flushPrimitive = (delimiterPos: number) => {
    if (primitiveStart < 0) return
    /** End position of the primitive is the char *before* the delimiter. */
    const endPos = delimiterPos - 1
    primitiveStart = -1
    onCompleteValue(endPos)
  }

  for (let i = 0; i < stripped.length; i += 1) {
    const ch = stripped[i]!

    if (inString) {
      if (escapeNext) {
        escapeNext = false
      } else if (ch === '\\') {
        escapeNext = true
      } else if (ch === '"') {
        inString = false
        const closingPos = i
        if (stack.length === 0) {
          /** Top-level string root. */
          onCompleteValue(closingPos)
        } else {
          const top = stack[stack.length - 1]!
          if (top.type === 'object' && top.expecting === 'key') {
            /** Just closed a KEY — not safe yet, awaiting `:` then a value. */
            top.expecting = 'colon'
          } else if (top.type === 'object' && top.expecting === 'value') {
            onCompleteValue(closingPos)
          } else if (top.type === 'array' && top.expecting === 'value') {
            onCompleteValue(closingPos)
          }
        }
        stringStart = -1
      }
      continue
    }

    if (primitiveStart >= 0) {
      /** Primitive literals end at any structural char or whitespace. */
      if (ch === ',' || ch === '}' || ch === ']' || /\s/.test(ch) || ch === ':') {
        flushPrimitive(i)
        /** fall through so the structural char itself is processed below */
      } else {
        continue
      }
    }

    if (/\s/.test(ch)) continue

    if (ch === '"') {
      inString = true
      escapeNext = false
      stringStart = i
      continue
    }

    if (ch === '{') {
      stack.push({ type: 'object', expecting: 'key' })
      continue
    }
    if (ch === '[') {
      stack.push({ type: 'array', expecting: 'value' })
      continue
    }

    if (ch === '}') {
      if (stack.length === 0) return null
      const top = stack[stack.length - 1]!
      if (top.type !== 'object') return null
      /** Empty object `{}` is valid; otherwise we must have just consumed a value (`expecting === 'comma'`). */
      if (top.expecting !== 'key' && top.expecting !== 'comma') return null
      stack.pop()
      onCompleteValue(i)
      continue
    }
    if (ch === ']') {
      if (stack.length === 0) return null
      const top = stack[stack.length - 1]!
      if (top.type !== 'array') return null
      if (top.expecting !== 'value' && top.expecting !== 'comma') return null
      stack.pop()
      onCompleteValue(i)
      continue
    }

    if (ch === ':') {
      const top = stack[stack.length - 1]
      if (!top || top.type !== 'object' || top.expecting !== 'colon') return null
      top.expecting = 'value'
      continue
    }

    if (ch === ',') {
      const top = stack[stack.length - 1]
      if (!top || top.expecting !== 'comma') return null
      top.expecting = top.type === 'object' ? 'key' : 'value'
      continue
    }

    /** Primitive literal char (number, true, false, null). */
    primitiveStart = i
  }

  /** End of input: if we ended cleanly inside a primitive, flush it. */
  if (primitiveStart >= 0 && !inString) {
    flushPrimitive(stripped.length)
  }

  if (lastSafeIndex < 0) return null

  let body = stripped.slice(0, lastSafeIndex + 1)
  body = body.replace(/[,\s]+$/u, '')

  const closers = lastSafeStackTypes
    .slice()
    .reverse()
    .map((t) => (t === 'object' ? '}' : ']'))
    .join('')

  const candidate = `${body}${closers}`
  try {
    JSON.parse(candidate)
    return candidate
  } catch {
    return null
  }

  /** Silence TS6133 — `topDone` & `stringStart` are tracked for clarity / future debugging. */
  void topDone
  void stringStart
}

/**
 * Coerce LLM-style synonyms for `goals[*].status` into the strict Zod enum.
 *
 * Real-world repros (gpt-4o-mini, Azure GPT-4o):
 *   - `"achieved"` / `"complete"` / `"done"` / `"success"` → `"completed"`
 *   - `"partial"` / `"partially"` / `"partly"` / `"in progress"` / `"half"` → `"partially_completed"`
 *   - `"not achieved"` / `"missed"` / `"failed"` / `"incomplete"` / `"not done"` / `"unmet"` → `"missed"`
 *
 * Returns the canonical enum value, or `null` when no confident mapping exists (caller leaves the
 * raw value alone so Zod produces a precise error message for ops).
 *
 * Exported for unit tests.
 */
export function normalizeGoalStatus(raw: unknown): 'completed' | 'partially_completed' | 'missed' | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim().toLowerCase().replace(/[_\-]+/g, ' ')
  if (!v) return null
  if (v === 'completed' || v === 'partially_completed' || v === 'missed') {
    return v as 'completed' | 'partially_completed' | 'missed'
  }
  if (/(^| )(not |un)(achieved|met|done|complete|completed|reached|finished|fulfilled)\b/.test(v)) return 'missed'
  if (/(^|\b)(missed|failed|fail|unmet|skipped|incomplete|abandoned|gave up|didn'?t do|did not (do|complete|finish))\b/.test(v)) {
    return 'missed'
  }
  if (/(^|\b)(partial|partially|partly|halfway|in[- ]?progress|on[- ]?track|started|some|mostly)\b/.test(v)) {
    return 'partially_completed'
  }
  if (/(^|\b)(achieved|complete|completed|done|success|successful|finished|reached|met|fulfilled|nailed|aced|hit)\b/.test(v)) {
    return 'completed'
  }
  return null
}

/** Allowed FAST recommendation practice types. Kept colocated with the normalizer below. */
const SUGGESTED_PRACTICE_TYPES = [
  'scenario_retry',
  'word_drill',
  'sentence_drill',
  'coach',
  'read_aloud',
  'listening',
] as const
type SuggestedPracticeType = (typeof SUGGESTED_PRACTICE_TYPES)[number]

/**
 * Coerce LLM free-text values for `recommendations.suggestedPracticeType` into the strict Zod enum.
 *
 * Real-world repros (gpt-4o-mini): `"Interactive exercises on question formation."`,
 * `"Word drill: question words"`, `"Try the scenario again with shorter sentences."`. The model
 * picks a description instead of the keyword. We infer the keyword via case-insensitive substring
 * matches; sentence_drill is the safe default because it's the most generic of the practice types.
 *
 * Exported for unit tests.
 */
export function normalizeSuggestedPracticeType(raw: unknown): SuggestedPracticeType | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim().toLowerCase()
  if (!v) return null
  if ((SUGGESTED_PRACTICE_TYPES as readonly string[]).includes(v)) return v as SuggestedPracticeType
  /** Most-specific patterns first so e.g. "word drill" doesn't match the generic sentence default. */
  if (/scenario|retry|redo|replay|run it back|repeat the scenario|try again/.test(v)) return 'scenario_retry'
  if (/word\s*drill|vocab(ulary)?|word(s)?\b|specific words?/.test(v)) return 'word_drill'
  if (/listen(ing)?|hear|audio comprehension/.test(v)) return 'listening'
  if (/read(ing)?\s*aloud|read aloud|out loud|shadowing/.test(v)) return 'read_aloud'
  if (/coach|tutor|guided|conversation with a coach|chat with the coach/.test(v)) return 'coach'
  if (/sentence|grammar|construction|structure|phrase|sentence pattern|drill\b/.test(v)) return 'sentence_drill'
  /**
   * Safe-default fallback: when the model returned a free-text *practice description* (e.g.
   * "Interactive exercises on question formation.", "Practice questions and short replies.")
   * but didn't match a more specific keyword, route to `sentence_drill` — the most generic of
   * the practice types — rather than returning `null` (which would cause complete deterministic
   * fallback and blank out the live coaching). The original wording is preserved by the caller
   * into `nextDrillReason` so no information is lost.
   */
  if (/exercise|practice|drill|task|activity|interactive|question|reply|response|conversation/.test(v)) {
    return 'sentence_drill'
  }
  return null
}

/**
 * Models sometimes emit `overall.primaryFocus` as a plain string. The Zod contract requires
 * `{ title, why, pattern, example }`. Normalise so validation succeeds without a repair LLM call.
 *
 * Also coerces enum-synonym values that the LLM commonly emits for `goals[*].status` and
 * `recommendations.suggestedPracticeType` — see {@link normalizeGoalStatus} and
 * {@link normalizeSuggestedPracticeType}.
 */
export function normalizeScenarioDialogueStructuredJsonRoot(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const root = { ...(value as Record<string, unknown>) }
  const overall = root.overall
  if (overall && typeof overall === 'object' && !Array.isArray(overall)) {
    const o = { ...(overall as Record<string, unknown>) }
    const pf = o.primaryFocus
    if (typeof pf === 'string') {
      const t = pf.trim()
      const head = (() => {
        const dot = t.indexOf('.')
        if (dot > 8 && dot < 160) return t.slice(0, dot + 1).trim()
        return t.slice(0, Math.min(120, t.length)).trim()
      })()
      o.primaryFocus = {
        title: (head || t.slice(0, 80)).trim().slice(0, 200) || 'Session focus',
        why: (t.slice(0, 600) || 'Focus from the live Dutch exchange.').trim(),
        pattern: '—',
        example: t.slice(0, 500),
      }
      root.overall = o
    }
  }

  const goals = root.goals
  if (Array.isArray(goals)) {
    root.goals = goals.map((g) => {
      if (!g || typeof g !== 'object' || Array.isArray(g)) return g
      const goal = { ...(g as Record<string, unknown>) }
      const normStatus = normalizeGoalStatus(goal.status)
      if (normStatus) goal.status = normStatus
      return goal
    })
  }

  const recs = root.recommendations
  if (recs && typeof recs === 'object' && !Array.isArray(recs)) {
    const r = { ...(recs as Record<string, unknown>) }
    const normPractice = normalizeSuggestedPracticeType(r.suggestedPracticeType)
    if (normPractice) {
      /**
       * Preserve the original free-text reason — it's the most useful hint the model gave us — by
       * appending it to `nextDrillReason` if that field is empty.
       */
      const original = typeof r.suggestedPracticeType === 'string' ? r.suggestedPracticeType.trim() : ''
      r.suggestedPracticeType = normPractice
      if (original && original !== normPractice) {
        const currentReason = typeof r.nextDrillReason === 'string' ? r.nextDrillReason.trim() : ''
        if (!currentReason) {
          r.nextDrillReason = original.slice(0, 200)
        }
      }
    }
    root.recommendations = r
  }

  const turns = root.turns
  if (Array.isArray(turns)) {
    root.turns = turns.map((turn) => {
      if (!turn || typeof turn !== 'object' || Array.isArray(turn)) return turn
      const t = { ...(turn as Record<string, unknown>) }
      for (const k of ['mainFix', 'correctedLine', 'strongerNaturalLine', 'practiceNext'] as const) {
        if (t[k] == null) {
          t[k] = ''
        }
      }
      return t
    })
  }
  return root
}

export function buildScenarioDialogueStructuredEvalInputFromMessages(params: {
  threadId: string
  scenarioTitle: string
  scenarioSlug: string
  scenarioGoals: string[]
  learnerLevel: string
  messages: ConversationMessage[]
  recapGoalsCompleted: string[]
  recapGoalsMissed: string[]
  recapWhatWentWell: string[]
  recapWhatToImprove: string[]
  previousWeakAreas?: string[]
}): ScenarioDialogueStructuredEvalInput {
  const n = Math.max(1, params.scenarioGoals.length)
  const w = 1 / n
  const goals = params.scenarioGoals.map((title, i) => ({
    goalId: `goal_${i}`,
    title,
    weight: Number(w.toFixed(4)),
  }))

  const ordered = [...params.messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  const dialogueTurns: ScenarioDialogueStructuredEvalInput['dialogueTurns'] = []
  for (const m of ordered) {
    if (m.sender !== 'user' && m.sender !== 'assistant') continue
    const meta = m.metadata as Record<string, unknown> | null | undefined
    const dur =
      typeof meta?.durationMs === 'number' && Number.isFinite(meta.durationMs)
        ? Math.round(meta.durationMs)
        : typeof meta?.audioDurationMs === 'number' && Number.isFinite(meta.audioDurationMs)
          ? Math.round(meta.audioDurationMs)
          : undefined
    const text = m.content.trim()
    if (!text) continue
    const isAssistant = m.sender === 'assistant'
    dialogueTurns.push({
      turnId: m.id,
      speaker: isAssistant ? 'assistant' : 'user',
      /**
       * Assistant lines are context only — compress aggressively (260 chars) so the FAST prompt
       * fits in budget. User text keeps the full window (2400 chars) since it is what we score.
       */
      text: isAssistant ? trunc(text, 260) : trunc(text, 2400),
      durationMs: dur,
    })
  }

  return {
    scenarioId: params.threadId,
    scenarioName: params.scenarioTitle,
    scenarioType: params.scenarioSlug.trim().toLowerCase().replace(/-/g, '_') || 'speak_live_voice',
    level: params.learnerLevel.trim().slice(0, 16),
    goals,
    dialogueTurns,
    recapHints: {
      goalsCompleted: params.recapGoalsCompleted,
      goalsMissed: params.recapGoalsMissed,
      whatWentWell: params.recapWhatWentWell,
      whatToImprove: params.recapWhatToImprove,
    },
    previousWeakAreas: params.previousWeakAreas?.length ? params.previousWeakAreas.slice(0, 24) : undefined,
  }
}

/**
 * Compact dialogue payload for the **fast** prompt: drops debug metadata (durationMs, recapHints,
 * previousWeakAreas, scenarioId) and trims goal records to {id, title, weight}. Assistant turns
 * shrink further to 200 chars; user turns keep 1400 chars (long enough to evaluate but short
 * enough to bound prompt size).
 */
function buildCompactDialogueForFast(d: ScenarioDialogueStructuredEvalInput) {
  return {
    scenarioName: d.scenarioName,
    scenarioType: d.scenarioType,
    level: d.level,
    goals: d.goals.map((g) => ({ id: g.goalId, title: g.title.slice(0, 140), weight: g.weight })),
    dialogue: d.dialogueTurns.map((t) =>
      t.speaker === 'assistant'
        ? { id: t.turnId, role: 'a', text: trunc(t.text, 200) }
        : { id: t.turnId, role: 'u', text: trunc(t.text, 1400) },
    ),
  }
}

function buildFastUserPayload(params: {
  dialogue: ScenarioDialogueStructuredEvalInput
  userTurnIdsOrdered: string[]
}): string {
  const body = {
    userTurnIdsOrdered: params.userTurnIdsOrdered,
    ...buildCompactDialogueForFast(params.dialogue),
  }
  return JSON.stringify(body).slice(0, 24_000)
}

function buildDeepUserPayload(params: {
  dialogue: ScenarioDialogueStructuredEvalInput
  userTurnIdsOrdered: string[]
  previewFacts: Array<{
    turnId: string
    turnIndex: number
    learnerTranscript: string
    learnerTranscriptNormalized: string
    assistantReply: string
    hasLearnerAudio: boolean
  }>
}): string {
  const body = {
    schemaBrief: {
      overall:
        'summary, scenarioOutcomeScore, taskCompletionScore, languageScore, conversationFlowScore, grammarScore, vocabularyScore, naturalnessScore, estimatedLevel A1|A2|B1|B2, confidence, primaryFocus {title,why,pattern,example}',
      goals:
        '{goalId,title,weight,status completed|partially_completed|missed,score,evidenceTurnIds,evidenceQuote,tryNext}[]',
      turns: 'ONLY user lines: {turnId, languageScores{grammar,vocabulary,sentenceStructure,naturalness,taskRelevance}, mainFix, whatLanded[], tightenNext[], correctedLine, strongerNaturalLine, weakPatterns[], saveablePhrase|null, practiceNext}[]',
      recommendations:
        '{nextDrillTitle,nextDrillReason,suggestedScenarioId|null,suggestedPracticeType scenario_retry|word_drill|sentence_drill|coach|read_aloud|listening}',
    },
    userTurnIdsOrdered: params.userTurnIdsOrdered,
    previewTurnFacts: params.previewFacts,
    dialogue: params.dialogue,
  }
  return JSON.stringify(body).slice(0, 48_000)
}

/** @deprecated use {@link buildFastUserPayload} or {@link buildDeepUserPayload}. */
function buildUserPayload(params: {
  dialogue: ScenarioDialogueStructuredEvalInput
  userTurnIdsOrdered: string[]
  previewFacts: Array<{
    turnId: string
    turnIndex: number
    learnerTranscript: string
    learnerTranscriptNormalized: string
    assistantReply: string
    hasLearnerAudio: boolean
  }>
}): string {
  return buildDeepUserPayload(params)
}

function assistantTurnIdSet(dialogue: ScenarioDialogueStructuredEvalInput): Set<string> {
  const s = new Set<string>()
  for (const t of dialogue.dialogueTurns) {
    if (t.speaker === 'assistant') s.add(t.turnId)
  }
  return s
}

/**
 * Parse model JSON, validate with Zod, enforce user-only turn rows, map to {@link LiveEvalLlmSession}.
 * Exported for unit tests (repair path, bounds, assistant-id guard).
 *
 * Accepts either a deep-schema or fast-schema payload — fast payloads are lifted into the deep shape
 * via {@link liftFastToDeepScenarioEvaluation} BEFORE mapping so all downstream consumers see the
 * same {@link ScenarioDialogueStructuredOutput}.
 */
export function processScenarioDialogueRawLlmResponse(params: {
  raw: string
  scenarioTitle: string
  scenarioGoals: string[]
  learnerLevel: string
  userTurnInputs: LiveEvalLlmTurnInput[]
  dialogue: ScenarioDialogueStructuredEvalInput
  /** Defaults to `'deep'` so existing tests / callers do not change behavior. */
  schema?: 'fast' | 'deep'
}):
  | { ok: true; structured: ScenarioDialogueStructuredOutput; data: LiveEvalLlmSession; validationMs: number }
  | { ok: false; reason: string; validationErrors: string[]; validationMs: number } {
  const t0 = Date.now()
  const validationErrors: string[] = []
  const parsed = parseJsonLoose(params.raw)
  if (!parsed.ok) {
    validationErrors.push(`parse: ${parsed.error}`)
    return { ok: false, reason: 'parse_error', validationErrors, validationMs: Date.now() - t0 }
  }

  const normalized = normalizeScenarioDialogueStructuredJsonRoot(parsed.value)
  let structured: ScenarioDialogueStructuredOutput
  if (params.schema === 'fast') {
    const zr = FastScenarioEvaluationSchema.safeParse(normalized)
    if (!zr.success) {
      for (const i of zr.error.issues.slice(0, 24)) {
        validationErrors.push(`${i.path.join('.')}: ${i.message}`)
      }
      return { ok: false, reason: 'schema_validation_failed', validationErrors, validationMs: Date.now() - t0 }
    }
    structured = liftFastToDeepScenarioEvaluation(zr.data)
  } else {
    const zr = ScenarioDialogueStructuredOutputSchema.safeParse(normalized)
    if (!zr.success) {
      for (const i of zr.error.issues.slice(0, 24)) {
        validationErrors.push(`${i.path.join('.')}: ${i.message}`)
      }
      return { ok: false, reason: 'schema_validation_failed', validationErrors, validationMs: Date.now() - t0 }
    }
    structured = zr.data
  }

  const assistantIds = assistantTurnIdSet(params.dialogue)
  for (const row of structured.turns) {
    if (assistantIds.has(row.turnId)) {
      validationErrors.push(`turns contains assistant turnId ${row.turnId}`)
    }
  }

  const expectedIds = params.userTurnInputs.map((t) => t.turnId)
  if (structured.turns.length !== expectedIds.length) {
    validationErrors.push(`turns length ${structured.turns.length} !== user turns ${expectedIds.length}`)
  }

  if (validationErrors.length) {
    return { ok: false, reason: 'semantic_validation_failed', validationErrors, validationMs: Date.now() - t0 }
  }

  /** Models often garble UUID hyphens; positional order is authoritative for user-only rows. */
  const structuredWithCanonicalTurnIds: ScenarioDialogueStructuredOutput = {
    ...structured,
    turns: structured.turns.map((row, i) => ({
      ...row,
      turnId: expectedIds[i]!,
    })),
  }

  let mapped: LiveEvalLlmSession
  try {
    mapped = mapScenarioDialogueStructuredToLiveEvalLlmSession({
      structured: structuredWithCanonicalTurnIds,
      scenarioTitle: params.scenarioTitle,
      scenarioGoals: params.scenarioGoals,
      learnerLevel: params.learnerLevel,
      userTurnInputs: params.userTurnInputs,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    validationErrors.push(`map: ${msg}`)
    return { ok: false, reason: 'map_error', validationErrors, validationMs: Date.now() - t0 }
  }

  const env = LiveEvalLlmSessionSchema.safeParse(mapped)
  if (!env.success) {
    for (const i of env.error.issues.slice(0, 24)) {
      validationErrors.push(`envelope.${i.path.join('.')}: ${i.message}`)
    }
    return { ok: false, reason: 'envelope_validation_failed', validationErrors, validationMs: Date.now() - t0 }
  }

  return { ok: true, structured: structuredWithCanonicalTurnIds, data: env.data, validationMs: Date.now() - t0 }
}

export type EvaluateScenarioDialogueStructuredOptions = {
  attemptJsonRepair?: boolean
  /**
   * Schema mode for this call:
   * - `'fast'` (default sync production): tight schema, ≤900 output tokens, latency-optimized.
   * - `'deep'` (optional async enrichment only): full schema, larger output budget.
   */
  mode?: ScenarioDialogueEvaluationMode
  onDiagnostics?: (
    d: ScenarioDialogueStructuredEvalDiagnostics & { repairAttempted: boolean; chatMs: number; repairMs: number },
  ) => void
  /** Fired once with the full {@link SpeakLiveOpenAiEvaluationDiagnosticsV1} envelope. */
  onOpenAiDiagnostics?: (d: SpeakLiveOpenAiEvaluationDiagnosticsV1) => void
}

function modelLabelForMode(mode: ScenarioDialogueEvaluationMode): string {
  return mode === 'fast'
    ? getReportEvalFastModelDiagnosticsLabel()
    : getSpeakLiveStructuredEvalModelDiagnosticsLabel()
}

function modelOverrideForMode(mode: ScenarioDialogueEvaluationMode): string {
  return mode === 'fast' ? getReportEvalModelFast() : getReportEvalModelDeep()
}

function maxTokensForMode(mode: ScenarioDialogueEvaluationMode, userTurnCount?: number): number {
  if (mode === 'fast') {
    if (typeof userTurnCount === 'number' && userTurnCount > 0) {
      return computeReportEvalMaxOutputTokensFastForTurns(userTurnCount)
    }
    return getReportEvalMaxOutputTokensFast()
  }
  return getReportEvalMaxOutputTokensDeep()
}

function systemPromptForMode(mode: ScenarioDialogueEvaluationMode): string {
  return mode === 'fast' ? FAST_SYSTEM_PROMPT : DEEP_SYSTEM_PROMPT
}

function schemaSizeCharsForMode(mode: ScenarioDialogueEvaluationMode): number {
  /** Approximate JSON-shape char counts so ops can spot accidental schema bloat. */
  return mode === 'fast' ? 540 : 1320
}

export async function evaluateScenarioDialogueStructured(
  params: {
    dialogue: ScenarioDialogueStructuredEvalInput
    userTurnInputs: LiveEvalLlmTurnInput[]
    scenarioTitle: string
    scenarioGoals: string[]
    learnerLevel: string
  },
  opts?: EvaluateScenarioDialogueStructuredOptions,
): Promise<EvaluateScenarioDialogueStructuredResult> {
  const mode: ScenarioDialogueEvaluationMode = opts?.mode ?? 'fast'
  const buildStartedAt = Date.now()
  const requestStartedAtIso = new Date().toISOString()

  const userTurnCount = params.userTurnInputs.length
  const maxTokens = maxTokensForMode(mode, userTurnCount)
  const requestTimeoutMs = mode === 'fast' ? getReportEvalFastRequestTimeoutMs() : undefined
  const userTurnIdsOrdered = params.userTurnInputs.map((t) => t.turnId)
  const previewFacts = params.userTurnInputs.map((t) => ({
    turnId: t.turnId,
    turnIndex: t.turnIndex,
    learnerTranscript: trunc(t.learnerTranscript, 2200),
    learnerTranscriptNormalized: trunc(t.learnerTranscriptNormalized, 2200),
    assistantReply: trunc(t.assistantReply, 800),
    hasLearnerAudio: t.hasLearnerAudio,
  }))

  const userContent =
    mode === 'fast'
      ? buildFastUserPayload({ dialogue: params.dialogue, userTurnIdsOrdered })
      : buildDeepUserPayload({ dialogue: params.dialogue, userTurnIdsOrdered, previewFacts })
  const baseSystemPrompt = systemPromptForMode(mode)
  /**
   * For FAST mode, append a *dynamic budget reminder* so the model self-paces to the user-turn
   * count. Without this the model emits ~210 tokens/turn regardless of the budget; the reminder
   * helps it shave verbose fields when there are many turns and avoid `finish_reason: "length"`.
   */
  const systemPrompt =
    mode === 'fast' && userTurnCount > 0
      ? `${baseSystemPrompt}

Output budget for THIS session: ${maxTokens} total output tokens for ${userTurnCount} user turn${userTurnCount === 1 ? '' : 's'}.
- Per-turn target: ≈ ${Math.max(120, Math.floor((maxTokens - 350) / userTurnCount))} tokens/turn for the \`turns[*]\` rows (the rest is overall + goals + recommendations).
- If you are running long, shorten \`mainFix\`, \`correctedLine\`, and \`strongerNaturalLine\` first — never drop turns and never truncate \`turnId\` strings.`
      : baseSystemPrompt
  const promptCharCount = systemPrompt.length + userContent.length
  const approximateInputTokens = estimateApproximateTokensFromChars(promptCharCount)
  const requestBuildMs = Date.now() - buildStartedAt
  const modelName = modelLabelForMode(mode)

  const baseDiagnostics = (): ScenarioDialogueStructuredEvalDiagnostics => ({
    promptCharCount,
    approximateInputTokens,
    approximateOutputTokens: 0,
    structuredLlmMs: 0,
    modelName,
    validationMs: 0,
    validationErrors: [],
  })

  const baseOpenAiDiag = (
    overrides: Partial<SpeakLiveOpenAiEvaluationDiagnosticsV1> = {},
  ): SpeakLiveOpenAiEvaluationDiagnosticsV1 => ({
    schemaName: mode,
    schemaSizeChars: schemaSizeCharsForMode(mode),
    modelName,
    requestStartedAt: requestStartedAtIso,
    requestCompletedAt: new Date().toISOString(),
    requestBuildMs,
    providerNetworkMs: 0,
    responseReadMs: 0,
    jsonParseMs: 0,
    schemaValidationMs: 0,
    repairAttempted: false,
    repairMs: 0,
    retryCount: 0,
    promptCharCount,
    responseCharCount: 0,
    approximateInputTokens,
    approximateOutputTokens: 0,
    maxOutputTokensRequested: maxTokens,
    requestTimeoutMs,
    ...overrides,
  })

  const cred = speakLiveEvalCredentialsReady()
  if (!cred.ok) {
    const d = baseDiagnostics()
    const oa = baseOpenAiDiag({ requestCompletedAt: new Date().toISOString() })
    opts?.onDiagnostics?.({ ...d, repairAttempted: false, chatMs: 0, repairMs: 0 })
    opts?.onOpenAiDiagnostics?.(oa)
    const reason =
      cred.reason === 'mock_provider'
        ? 'mock_provider'
        : cred.reason === 'azure_openai_not_configured'
          ? 'azure_openai_not_configured'
          : 'no_api_key'
    return {
      ok: false,
      reason,
      diagnostics: d,
      openaiDiagnostics: oa,
      repairAttempted: false,
      chatMs: 0,
      repairMs: 0,
      schemaName: mode,
    }
  }

  const runOnce = async (rawInput: string): Promise<RunSpeakLiveEvalChatCompletionResult> => {
    return runSpeakLiveEvalChatCompletionRich({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawInput },
      ],
      maxOutputTokens: maxTokens,
      temperature: 0,
      jsonResponseFormat: true,
      openAiModel: modelOverrideForMode(mode),
      requestTimeoutMs,
    })
  }

  const chatStarted = Date.now()
  let primaryResult: RunSpeakLiveEvalChatCompletionResult
  try {
    primaryResult = await runOnce(userContent)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const chatMs = Date.now() - chatStarted
    const d = { ...baseDiagnostics(), structuredLlmMs: chatMs, approximateOutputTokens: 0 }
    const oa = baseOpenAiDiag({
      providerNetworkMs: chatMs,
      responseReadMs: 0,
      requestCompletedAt: new Date().toISOString(),
    })
    opts?.onDiagnostics?.({ ...d, repairAttempted: false, chatMs, repairMs: 0 })
    opts?.onOpenAiDiagnostics?.(oa)
    return {
      ok: false,
      reason: msg,
      raw: '',
      diagnostics: d,
      openaiDiagnostics: oa,
      repairAttempted: false,
      chatMs,
      repairMs: 0,
      schemaName: mode,
    }
  }
  let raw = primaryResult.content
  const chatMs = Date.now() - chatStarted

  let repairAttempted = false
  let repairMs = 0
  let retryCount = 0
  let validationMsTotal = 0
  let jsonParseMsTotal = 0
  let schemaValidationMsTotal = 0
  let lengthSalvageAttempted = false
  let lengthSalvageOk = false

  const tryProcess = (r: string) => {
    const parseStarted = Date.now()
    const looseParse = parseJsonLoose(r)
    const parseElapsed = Date.now() - parseStarted
    jsonParseMsTotal += parseElapsed
    if (!looseParse.ok) {
      validationMsTotal += parseElapsed
      return {
        ok: false as const,
        reason: 'parse_error',
        validationErrors: [`parse: ${looseParse.error}`],
        validationMs: parseElapsed,
      }
    }
    const validationStarted = Date.now()
    const out = processScenarioDialogueRawLlmResponse({
      raw: r,
      scenarioTitle: params.scenarioTitle,
      scenarioGoals: params.scenarioGoals,
      learnerLevel: params.learnerLevel,
      userTurnInputs: params.userTurnInputs,
      dialogue: params.dialogue,
      schema: mode,
    })
    const validationElapsed = Date.now() - validationStarted
    schemaValidationMsTotal += validationElapsed
    validationMsTotal += out.validationMs
    return out
  }

  let first = tryProcess(raw)

  /**
   * STRUCTURAL JSON SALVAGE — recover from `finish_reason: "length"` truncations without an extra
   * LLM round-trip. We only attempt salvage when:
   *   1. the primary response was truncated by the model's output cap (`finish_reason: "length"`),
   *      OR the parse failed for a reason that strongly correlates with truncation
   *      (`Unterminated string`, `Unexpected end of JSON input`), AND
   *   2. the failure mode is `parse_error` (semantic schema failures take a different route).
   *
   * Salvaged JSON is then re-validated through the same schema; if the truncated tail dropped a
   * required field the salvage will still fail validation cleanly and the deterministic fallback
   * takes over (no infinite loop, no extra LLM calls).
   */
  const lengthLikeReason =
    primaryResult.finishReason === 'length' ||
    (first.ok === false &&
      first.reason === 'parse_error' &&
      first.validationErrors.some(
        (e) => /Unterminated string/i.test(e) || /Unexpected end of JSON/i.test(e),
      ))
  if (!first.ok && lengthLikeReason) {
    lengthSalvageAttempted = true
    const salvaged = salvageTruncatedJson(raw)
    if (salvaged && salvaged !== raw) {
      const salvageOut = tryProcess(salvaged)
      if (salvageOut.ok) {
        lengthSalvageOk = true
        raw = salvaged
        first = salvageOut
      }
    }
  }

  if (!first.ok && opts?.attemptJsonRepair) {
    repairAttempted = true
    retryCount += 1
    const issues = first.validationErrors.join('; ')
    const repairStarted = Date.now()
    const repaired = await repairScenarioDialogueStructuredJson({
      failedJsonSnippet: raw,
      validationIssues: issues,
      userTurnIdsOrdered,
    })
    repairMs = Date.now() - repairStarted
    if (repaired) {
      raw = repaired
      first = tryProcess(repaired)
    }
  }

  const structuredLlmMs = chatMs + repairMs
  const approximateOutputTokens = estimateApproximateTokensFromChars(raw.length)
  const validationErrors = first.ok ? [] : first.validationErrors

  const diagnostics: ScenarioDialogueStructuredEvalDiagnostics = {
    promptCharCount,
    approximateInputTokens,
    approximateOutputTokens,
    structuredLlmMs,
    modelName,
    validationMs: validationMsTotal,
    validationErrors,
  }

  const openaiDiagnostics: SpeakLiveOpenAiEvaluationDiagnosticsV1 = baseOpenAiDiag({
    /**
     * `providerNetworkMs` here is the **primary** call wall time only — repair retries are tracked
     * via `retryCount` + `repairMs` so consumers can compute total provider time as
     * `providerNetworkMs + repairMs`. `structuredLlmMs` ALWAYS = providerNetworkMs + responseReadMs
     * + repairMs (no prompt build, no parse, no validation).
     */
    providerNetworkMs: primaryResult.providerNetworkMs,
    responseReadMs: primaryResult.responseReadMs,
    jsonParseMs: jsonParseMsTotal,
    schemaValidationMs: schemaValidationMsTotal,
    repairAttempted,
    repairMs,
    retryCount,
    requestId: primaryResult.requestId,
    finishReason: primaryResult.finishReason,
    actualInputTokens: primaryResult.usage?.promptTokens,
    actualOutputTokens: primaryResult.usage?.completionTokens,
    totalTokens: primaryResult.usage?.totalTokens,
    approximateOutputTokens,
    responseCharCount: raw.length,
    requestCompletedAt: new Date().toISOString(),
    lengthSalvageAttempted,
    lengthSalvageOk,
    maxOutputTokensRequested: maxTokens,
    requestTimeoutMs,
  })

  opts?.onDiagnostics?.({ ...diagnostics, repairAttempted, chatMs, repairMs })
  opts?.onOpenAiDiagnostics?.(openaiDiagnostics)

  if (first.ok) {
    return {
      ok: true,
      data: first.data,
      structured: first.structured,
      raw,
      diagnostics,
      openaiDiagnostics,
      repairAttempted,
      chatMs,
      repairMs,
      schemaName: mode,
    }
  }

  return {
    ok: false,
    reason: first.validationErrors.join('; ') || first.reason,
    raw,
    diagnostics,
    openaiDiagnostics,
    repairAttempted,
    chatMs,
    repairMs,
    schemaName: mode,
  }
}

/** Re-export so tests can introspect the deep schema directly. */
export { DeepScenarioEvaluationSchema, FastScenarioEvaluationSchema }

/** Local module-only helper to silence TS unused warning on the deprecated payload helper. */
void buildUserPayload
