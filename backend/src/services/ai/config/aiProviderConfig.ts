import { AiConfigurationError } from '../errors'

export type AiProviderId = 'openai' | 'azure-openai' | 'mock'

function trimEnv(key: string): string {
  return process.env[key]?.trim() ?? ''
}

/**
 * Resolve which conversation AI provider is active.
 *
 * Priority:
 * 1. `AI_PROVIDER` when set to `openai` | `azure-openai` | `mock`
 * 2. If unset: use **openai** when `OPENAI_API_KEY` is set, else **azure-openai** when Azure chat keys exist.
 * 3. Else **`mock`** only when no LLM credentials are configured (safe offline default).
 *
 * `APP_PROFILE=LocalMock` no longer forces mock when real API keys are present — set `AI_PROVIDER=mock` to force mock.
 */
export function getResolvedAiProviderId(): AiProviderId {
  const explicit = trimEnv('AI_PROVIDER').toLowerCase()
  if (explicit === 'openai' || explicit === 'azure-openai' || explicit === 'mock') {
    return explicit
  }

  const hasOpenAi = Boolean(trimEnv('OPENAI_API_KEY'))
  const hasAzure = Boolean(trimEnv('AZURE_OPENAI_ENDPOINT') && trimEnv('AZURE_OPENAI_API_KEY'))
  if (hasOpenAi) return 'openai'
  if (hasAzure) return 'azure-openai'
  return 'mock'
}

/**
 * Text / default Stage A chat model (`TEXT_CHAT_MODEL` overrides `OPENAI_MODEL_CONVERSATION`).
 * Not used for Speak Live ultra-lean — see {@link getOpenAiLiveReplyModel}.
 */
export function getOpenAiConversationModel(): string {
  return (
    trimEnv('CHAT_REPLY_MODEL') ||
    trimEnv('TEXT_CHAT_MODEL') ||
    trimEnv('OPENAI_MODEL_CONVERSATION') ||
    trimEnv('OPENAI_MODEL') ||
    'gpt-4o-mini'
  )
}

/** Speak Live ultra-lean Stage A — prefer `LIVE_REPLY_MODEL`, else conversation model chain. */
export function getOpenAiLiveReplyModel(): string {
  return trimEnv('LIVE_REPLY_MODEL') || getOpenAiConversationModel()
}

/**
 * Language-coach LIVE Stage A — defaults to `gpt-4.1-mini` (materially faster per-token than
 * `gpt-4o-mini` at comparable quality for short Dutch teaching replies). Override with
 * `LANGUAGE_COACH_REPLY_MODEL` (e.g. to pin `gpt-4o-mini` for keys without 4.1 access).
 *
 * Background — bug 2026-05-16: with the coach budget at 600 tokens, `gpt-4o-mini` was
 * streaming for ~6-8s per turn (first-token at ~1s, then ~5-7s of token generation), which
 * tripped the "LIVE TURN OVER BUDGET" warning. `gpt-4.1-mini` typically halves the
 * generation phase for replies of the same length without compromising the JSON envelope
 * or the Dutch instruction-following the coach prompt depends on.
 */
export function getOpenAiLanguageCoachReplyModel(): string {
  return trimEnv('LANGUAGE_COACH_REPLY_MODEL') || 'gpt-4.1-mini'
}

/** Coach / extraction / recap (`EVAL_MODEL` overrides `OPENAI_MODEL_ENRICHMENT`). */
export function getOpenAiEnrichmentModel(): string {
  return (
    trimEnv('EVALUATION_MODEL') ||
    trimEnv('EVAL_MODEL') ||
    trimEnv('OPENAI_MODEL_ENRICHMENT') ||
    getOpenAiConversationModel()
  )
}

/**
 * Speak Live **post-session voice report** — one large JSON completion (`runLiveSessionEvaluationLlm`).
 * Set `SPEAK_LIVE_SESSION_EVAL_MODEL` to a faster deployment (e.g. `gpt-4o-mini`) without changing
 * turn enrichment, gloss, or other {@link getOpenAiEnrichmentModel} callers.
 */
export function getSpeakLiveSessionEvaluationModel(): string {
  return trimEnv('SPEAK_LIVE_SESSION_EVAL_MODEL') || getOpenAiEnrichmentModel()
}

/**
 * Speak Live **recommendation verify** pass (word corrections + reference line sanity).
 * Defaults to {@link getSpeakLiveSessionEvaluationModel}. Override with `SPEAK_LIVE_EVAL_VERIFY_MODEL` for a smaller/faster deployment.
 */
export function getSpeakLiveRecommendationVerifyModel(): string {
  return trimEnv('SPEAK_LIVE_EVAL_VERIFY_MODEL') || getSpeakLiveSessionEvaluationModel()
}

/**
 * Speak Live **full report audit** pass (post-enrichment sanity on wrong words + reference + consistency).
 * Override with `SPEAK_LIVE_EVAL_REPORT_AUDIT_MODEL`; defaults to {@link getSpeakLiveSessionEvaluationModel}.
 */
export function getSpeakLiveReportAuditModel(): string {
  return trimEnv('SPEAK_LIVE_EVAL_REPORT_AUDIT_MODEL') || getSpeakLiveSessionEvaluationModel()
}

/**
 * Speak Live **structured transcript** pass (compact JSON + Zod) before mapping into the legacy coaching envelope.
 * Default `gpt-4o-mini` for latency; set `SPEAK_LIVE_STRUCTURED_TRANSCRIPT_EVAL_MODEL=gpt-4.1-mini` when your org deploys it.
 *
 * @deprecated Prefer {@link getReportEvalModelFast} / {@link getReportEvalModelDeep} for the FluentCopilot
 * scenario report fast/deep two-stage flow. This function is kept as the legacy default for backwards
 * compatibility (e.g. JSON repair pass uses the SAME model as the primary call).
 */
export function getSpeakLiveStructuredTranscriptEvalModel(): string {
  return trimEnv('SPEAK_LIVE_STRUCTURED_TRANSCRIPT_EVAL_MODEL') || 'gpt-4o-mini'
}

export function getSpeakLiveStructuredTranscriptEvalTemperature(): number {
  const n = Number.parseFloat(trimEnv('SPEAK_LIVE_STRUCTURED_TRANSCRIPT_EVAL_TEMPERATURE'))
  if (Number.isFinite(n) && n >= 0 && n <= 0.5) return n
  return 0.1
}

export function getSpeakLiveStructuredTranscriptEvalMaxOutputTokens(): number {
  const n = Number.parseInt(trimEnv('SPEAK_LIVE_STRUCTURED_TRANSCRIPT_EVAL_MAX_TOKENS') ?? '', 10)
  if (Number.isFinite(n) && n >= 800 && n <= 8192) return Math.floor(n)
  return 4096
}

// ─── Two-stage scenario report (FAST sync + optional DEEP enrichment) ────

/**
 * **FAST** scenario evaluation model — used by the synchronous report path. This is the default
 * production model: fastest reliable structured-output completion model.
 *
 * Default raised from `gpt-4o-mini` → `gpt-4.1-mini` (May 2026): real diagnostics on
 * `gpt-4o-mini` showed 25–90s end-to-end latency for the FluentCopilot FAST envelope (~1600
 * output tokens) due to provider-side throughput degradation. `gpt-4.1-mini` is typically 2–3×
 * faster on structured JSON output at equivalent reliability for short Dutch coaching payloads.
 *
 * Override with `REPORT_EVAL_MODEL_FAST` (or fall back to `SPEAK_LIVE_STRUCTURED_TRANSCRIPT_EVAL_MODEL`
 * for backwards compatibility).
 */
export function getReportEvalModelFast(): string {
  return (
    trimEnv('REPORT_EVAL_MODEL_FAST') ||
    trimEnv('SPEAK_LIVE_STRUCTURED_TRANSCRIPT_EVAL_MODEL') ||
    'gpt-4.1-mini'
  )
}

/**
 * **DEEP** scenario evaluation model — only used by optional deep enrichment passes (never blocks
 * the initial report). May be a stronger / slower model.
 */
export function getReportEvalModelDeep(): string {
  return trimEnv('REPORT_EVAL_MODEL_DEEP') || getReportEvalModelFast()
}

/**
 * FAST schema max output tokens (default cap when turn count is unknown).
 *
 * Empirically a 4-turn `gpt-4o-mini` completion of the FAST envelope sits around 1100–1300 output
 * tokens after the schema/prompt tightening. Defaulting to 900 was triggering `finish_reason:
 * length` truncations and falling back to deterministic coaching ("LIVE COACHING MODEL UNAVAILABLE"
 * banner). Default raised to 1100; clamped to [600, 2400].
 *
 * For dynamic per-session budgeting, prefer {@link computeReportEvalMaxOutputTokensFastForTurns}
 * which scales with the number of user turns.
 */
export function getReportEvalMaxOutputTokensFast(): number {
  const n = Number.parseInt(trimEnv('REPORT_EVAL_MAX_OUTPUT_TOKENS_FAST') ?? '', 10)
  if (Number.isFinite(n) && n >= 600 && n <= 2400) return Math.floor(n)
  return 1100
}

/**
 * Turn-aware FAST output token budget — gives the FAST schema enough headroom to finish without
 * `finish_reason: length` truncation while still being meaningfully smaller than the deep budget.
 *
 * Heuristic (chars-per-turn cap × 0.28 tokens/char × turns + envelope overhead):
 * - base envelope (overall + goals + recommendations): ~520 tokens
 * - per user turn (scores + mainFix + 2× strengths + 2× improvements + corrected + stronger): ~210 tokens
 *
 * Result is clamped to `[base, ceiling]` where ceiling = `REPORT_EVAL_MAX_OUTPUT_TOKENS_FAST × 2`,
 * but never above 2400 — that's the absolute upper bound for the synchronous FAST path so latency
 * stays predictable.
 */
export function computeReportEvalMaxOutputTokensFastForTurns(userTurnCount: number): number {
  const base = getReportEvalMaxOutputTokensFast()
  const turns = Math.max(0, Math.floor(userTurnCount))
  if (turns === 0) return base
  const dynamic = 520 + 210 * turns
  const ceiling = Math.min(2400, base * 2)
  return Math.max(base, Math.min(ceiling, dynamic))
}

/**
 * DEEP schema max output tokens — only used by optional deep enrichment, which is async / non-blocking.
 * Clamped to [800, 8192]; default 4096.
 */
export function getReportEvalMaxOutputTokensDeep(): number {
  const n = Number.parseInt(trimEnv('REPORT_EVAL_MAX_OUTPUT_TOKENS_DEEP') ?? '', 10)
  if (Number.isFinite(n) && n >= 800 && n <= 8192) return Math.floor(n)
  return 4096
}

/**
 * When `true`, an extra **deep** scenario evaluation pass runs in the background and merges into the
 * stored report after the fast report has already been returned. Default: **off**.
 *
 * Set `REPORT_ENABLE_DEEP_REPORT_ENRICHMENT=true|1|on|yes` to enable.
 */
export function isReportDeepEnrichmentEnabled(): boolean {
  return envFlagTrue('REPORT_ENABLE_DEEP_REPORT_ENRICHMENT')
}

/**
 * Per-call timeout for the **synchronous** single-call FAST scenario evaluation request.
 *
 * Default 45s — kept tight enough to abort the >60s "provider degraded" cliff. When the
 * parallel-fan-out path is enabled (default) this timeout is mostly irrelevant since each
 * sub-call uses {@link getReportEvalFastSubcallTimeoutMs}. Retained for the legacy single-call
 * fallback path (REPORT_EVAL_PARALLEL_TURNS=false).
 *
 * Override with `REPORT_EVAL_FAST_TIMEOUT_MS`; clamped to [8000, 60000].
 */
export function getReportEvalFastRequestTimeoutMs(): number {
  const n = Number.parseInt(trimEnv('REPORT_EVAL_FAST_TIMEOUT_MS') ?? '', 10)
  if (Number.isFinite(n) && n >= 8_000 && n <= 60_000) return n
  return 45_000
}

/**
 * Whether the FAST scenario evaluation should fan out into N+1 parallel sub-calls (1 overall +
 * one per user turn) instead of issuing a single combined call.
 *
 * **Default ON** — this is the architectural fix for high single-call latency. With N+1 parallel
 * calls each emitting ~150–400 output tokens, total wall time = `max(sub-call latency)` ≈ 3–8s
 * on a healthy provider, vs. `sum(everything)` ≈ 25–90s with one big call.
 *
 * Set `REPORT_EVAL_PARALLEL_TURNS=false|0|off|no` to fall back to the legacy single-call FAST
 * path (still useful for A/B comparison or when the parallel path encounters an unforeseen bug).
 */
export function isReportEvalParallelTurnsEnabled(): boolean {
  const v = trimEnv('REPORT_EVAL_PARALLEL_TURNS')
  if (!v) return true
  return /^(true|1|on|yes)$/i.test(v)
}

/**
 * Per-call timeout (ms) for **each** parallel FAST sub-call (overall + per-turn). Tighter than
 * the single-call timeout because each sub-call is much smaller and should finish in a few seconds
 * even on a slow deployment. When this fires for a per-turn sub-call we synthesize a deterministic
 * stub for that single turn and keep the rest of the report; when it fires for the overall call,
 * the entire FAST evaluation falls back to deterministic.
 *
 * Default 25s. Override with `REPORT_EVAL_FAST_SUBCALL_TIMEOUT_MS`; clamped to [4000, 45000].
 */
export function getReportEvalFastSubcallTimeoutMs(): number {
  const n = Number.parseInt(trimEnv('REPORT_EVAL_FAST_SUBCALL_TIMEOUT_MS') ?? '', 10)
  if (Number.isFinite(n) && n >= 4_000 && n <= 45_000) return n
  return 25_000
}

/**
 * Max output tokens for the parallel FAST **overall** sub-call (`overall + goals + recommendations`,
 * NO turns). Default 600 — enough headroom for a 4-key overall + goals[≤6] + recommendations
 * without bloat.
 *
 * Override with `REPORT_EVAL_MAX_OUTPUT_TOKENS_FAST_OVERALL`; clamped to [300, 1200].
 */
export function getReportEvalMaxOutputTokensFastOverall(): number {
  const n = Number.parseInt(trimEnv('REPORT_EVAL_MAX_OUTPUT_TOKENS_FAST_OVERALL') ?? '', 10)
  if (Number.isFinite(n) && n >= 300 && n <= 1_200) return n
  return 600
}

/**
 * Max output tokens per parallel FAST **per-turn** sub-call. Default 280 — fits the single-turn
 * envelope (`turnId + scores + mainFix + 2 strengths + 2 improvements + correctedLine + strongerNaturalLine`)
 * with room for the JSON wrapper.
 *
 * Override with `REPORT_EVAL_MAX_OUTPUT_TOKENS_FAST_PER_TURN`; clamped to [160, 600].
 */
export function getReportEvalMaxOutputTokensFastPerTurn(): number {
  const n = Number.parseInt(trimEnv('REPORT_EVAL_MAX_OUTPUT_TOKENS_FAST_PER_TURN') ?? '', 10)
  if (Number.isFinite(n) && n >= 160 && n <= 600) return n
  return 280
}

/** Diagnostics label for the FAST scenario evaluator (FluentCopilot two-stage report). */
export function getReportEvalFastModelDiagnosticsLabel(): string {
  if (getResolvedAiProviderId() === 'azure-openai') {
    return `${getAzureOpenAiSpeakLiveStructuredEvalDeployment()} [azure-openai]`
  }
  return getReportEvalModelFast()
}

/** When `1`, skip structured JSON and use the legacy monolithic session-eval prompt in `liveSessionEvaluationLlm`. */
export function isSpeakLiveLegacyTranscriptEvalLlmEnabled(): boolean {
  return trimEnv('SPEAK_LIVE_LEGACY_TRANSCRIPT_EVAL_LLM') === '1'
}

/**
 * After structured transcript eval fails, whether to run the legacy monolithic eval (default on).
 * Set `SPEAK_LIVE_TRANSCRIPT_EVAL_LEGACY_FALLBACK=0` to use deterministic only.
 */
export function isSpeakLiveTranscriptEvalLegacyFallbackEnabled(): boolean {
  const raw = trimEnv('SPEAK_LIVE_TRANSCRIPT_EVAL_LEGACY_FALLBACK').toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'off') return false
  return true
}

/**
 * Post-session Speak Live runs **Azure pronunciation assessment** and the **structured scenario-dialogue LLM**
 * in parallel, then merges. Set `SPEAK_LIVE_PARALLEL_SCENARIO_REPORT=0|off|false` to use the legacy
 * sequential lane (`assess → transcript LLM`).
 */
export function isSpeakLiveParallelScenarioReportOptimizedEnabled(): boolean {
  const raw = trimEnv('SPEAK_LIVE_PARALLEL_SCENARIO_REPORT').toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'off') return false
  return true
}

function envFlagTrue(key: string): boolean {
  const v = trimEnv(key).toLowerCase()
  return v === 'true' || v === '1' || v === 'yes' || v === 'on'
}

/** Extra OpenAI report-audit pass. Default off — set `REPORT_ENABLE_EXPENSIVE_AUDIT=true` (or `1`) to enable. */
export function isReportExpensiveAuditEnabled(): boolean {
  return envFlagTrue('REPORT_ENABLE_EXPENSIVE_AUDIT')
}

/** Extra OpenAI recommendation-verify pass. Default off — set `REPORT_ENABLE_RECOMMENDATION_VERIFY=true` to enable. */
export function isReportRecommendationVerifyEnabled(): boolean {
  return envFlagTrue('REPORT_ENABLE_RECOMMENDATION_VERIFY')
}

/** Deterministic `enrichTurnReportFields` polish pass (can be heavy on many turns). Default off. */
export function isReportLegacyTurnEnrichmentEnabled(): boolean {
  return envFlagTrue('REPORT_ENABLE_TURN_ENRICHMENT_LEGACY')
}

/** End-of-thread recap — may use a stronger model in production. */
export function getOpenAiRecapModel(): string {
  return trimEnv('OPENAI_MODEL_RECAP') || getOpenAiEnrichmentModel()
}

export function getOpenAiDirectConfig() {
  return {
    apiKey: trimEnv('OPENAI_API_KEY'),
    /** @deprecated use getOpenAiConversationModel() — kept for external callers reading cfg.model */
    model: getOpenAiConversationModel(),
    baseURL: trimEnv('OPENAI_BASE_URL') || undefined,
    organization: trimEnv('OPENAI_ORG') || undefined,
    project: trimEnv('OPENAI_PROJECT') || undefined,
  }
}

export function getAzureOpenAiConversationConfig() {
  const endpoint = trimEnv('AZURE_OPENAI_ENDPOINT').replace(/\/$/, '')
  const deployment =
    trimEnv('AZURE_OPENAI_DEPLOYMENT_CHAT') || trimEnv('AZURE_OPENAI_DEPLOYMENT') || 'gpt-4o-mini'
  return {
    endpoint,
    apiKey: trimEnv('AZURE_OPENAI_API_KEY'),
    apiVersion: trimEnv('AZURE_OPENAI_API_VERSION') || '2024-08-01-preview',
    deployment,
  }
}

/** Optional faster deployment for Speak Live ultra-lean; defaults to chat deployment. */
export function getAzureOpenAiLiveReplyDeployment(): string {
  return trimEnv('AZURE_OPENAI_DEPLOYMENT_LIVE_REPLY') || getAzureOpenAiConversationConfig().deployment
}

/**
 * Optional Azure deployment override for language-coach LIVE Stage A. Mirrors the OpenAI-side
 * {@link getOpenAiLanguageCoachReplyModel} so Azure deployments can also pin a faster model
 * (e.g. a `gpt-4.1-mini`-class deployment) for the coach reply path without affecting other
 * scenarios. Falls back to the standard chat deployment when unset.
 */
export function getAzureOpenAiLanguageCoachReplyDeployment(): string {
  return (
    trimEnv('AZURE_OPENAI_DEPLOYMENT_LANGUAGE_COACH_REPLY') ||
    getAzureOpenAiConversationConfig().deployment
  )
}

/** Optional separate deployment for Stage B (defaults to chat deployment). */
export function getAzureOpenAiEnrichmentDeployment(): string {
  return trimEnv('AZURE_OPENAI_DEPLOYMENT_ENRICHMENT') || getAzureOpenAiConversationConfig().deployment
}

/**
 * Azure deployment for Speak Live **structured scenario-dialogue JSON** (parallel + repair paths)
 * when `AI_PROVIDER=azure-openai`. Must be a deployment that supports `response_format: json_object`.
 * Override: `AZURE_OPENAI_DEPLOYMENT_SPEAK_LIVE_STRUCTURED`; defaults to {@link getAzureOpenAiEnrichmentDeployment}.
 */
export function getAzureOpenAiSpeakLiveStructuredEvalDeployment(): string {
  return trimEnv('AZURE_OPENAI_DEPLOYMENT_SPEAK_LIVE_STRUCTURED') || getAzureOpenAiEnrichmentDeployment()
}

/**
 * Azure deployment for the **legacy monolithic** session coaching JSON (`runLiveSessionEvaluationLlm` fallback).
 * Override: `AZURE_OPENAI_DEPLOYMENT_SPEAK_LIVE_SESSION_EVAL`; defaults to {@link getAzureOpenAiSpeakLiveStructuredEvalDeployment}.
 */
export function getAzureOpenAiSpeakLiveSessionEvalDeployment(): string {
  return trimEnv('AZURE_OPENAI_DEPLOYMENT_SPEAK_LIVE_SESSION_EVAL') || getAzureOpenAiSpeakLiveStructuredEvalDeployment()
}

/** Human-readable model/deployment label for Speak Live structured-eval diagnostics. */
export function getSpeakLiveStructuredEvalModelDiagnosticsLabel(): string {
  if (getResolvedAiProviderId() === 'azure-openai') {
    return `${getAzureOpenAiSpeakLiveStructuredEvalDeployment()} [azure-openai]`
  }
  return getSpeakLiveStructuredTranscriptEvalModel()
}

export type SpeakLiveEvalCredentialsResult =
  | { ok: true }
  | { ok: false; reason: 'mock_provider' | 'no_api_key' | 'azure_openai_not_configured' }

/**
 * Whether post-session Speak Live eval LLM calls can run for the resolved {@link AiProviderId}.
 * Used by structured dialogue / transcript evaluators and {@link assertSpeakLiveSessionEvaluationAiReady}.
 */
export function speakLiveEvalCredentialsReady(): SpeakLiveEvalCredentialsResult {
  const id = getResolvedAiProviderId()
  if (id === 'mock') return { ok: false, reason: 'mock_provider' }
  if (id === 'azure-openai') {
    const c = getAzureOpenAiConversationConfig()
    if (!c.endpoint?.trim() || !c.apiKey?.trim()) {
      return { ok: false, reason: 'azure_openai_not_configured' }
    }
    return { ok: true }
  }
  if (!getOpenAiDirectConfig().apiKey?.trim()) {
    return { ok: false, reason: 'no_api_key' }
  }
  return { ok: true }
}

export function getAiRequestTimeoutMs(): number {
  const n = Number.parseInt(process.env.AI_REQUEST_TIMEOUT_MS ?? '', 10)
  if (Number.isFinite(n) && n > 0) return n
  return 120_000
}

/** Live turns use a tighter timeout — no point waiting 120s for a 1-sentence reply. */
export function getLiveAiRequestTimeoutMs(): number {
  const n = Number.parseInt(process.env.LIVE_AI_REQUEST_TIMEOUT_MS ?? '', 10)
  if (Number.isFinite(n) && n >= 3_000 && n <= 30_000) return n
  return 15_000
}

export function getAiMaxRetries(): number {
  const n = Number.parseInt(process.env.AI_MAX_RETRIES ?? '', 10)
  if (Number.isFinite(n) && n >= 0) return Math.min(n, 5)
  return 2
}

/**
 * Speak Live post-session coaching LLM timeout.
 * Default 120s — large JSON + `max_tokens: 5000` can exceed 45s on slow networks; host.json allows 5m.
 * Override with `SPEAK_LIVE_EVAL_AI_TIMEOUT_MS` (5000–280000).
 */
export function getSpeakLiveEvaluationAiRequestTimeoutMs(): number {
  const n = Number.parseInt(process.env.SPEAK_LIVE_EVAL_AI_TIMEOUT_MS ?? '', 10)
  if (Number.isFinite(n) && n >= 5_000 && n <= 280_000) return n
  return 120_000
}

/** OpenAI client retries for transient connection issues (default 1). Max 3. */
export function getSpeakLiveEvaluationAiMaxRetries(): number {
  const n = Number.parseInt(process.env.SPEAK_LIVE_EVAL_AI_MAX_RETRIES ?? '', 10)
  if (Number.isFinite(n) && n >= 0 && n <= 3) return n
  return 1
}

/**
 * When the post-session **verify** and **report-audit** LLM passes process many turns, they are split
 * into batches of this size and run **in parallel** to reduce wall time (same models, same prompts per turn).
 * Override with `SPEAK_LIVE_EVAL_PARALLEL_BATCH_SIZE` (3–12). Default 6.
 */
export function getSpeakLiveEvalParallelBatchTurns(): number {
  const n = Number.parseInt(process.env.SPEAK_LIVE_EVAL_PARALLEL_BATCH_SIZE ?? '', 10)
  if (Number.isFinite(n) && n >= 3 && n <= 12) return n
  return 6
}

/** Live turns: 0 retries — fail fast so the client can show fallback UX. */
export function getLiveAiMaxRetries(): number {
  const n = Number.parseInt(process.env.LIVE_AI_MAX_RETRIES ?? '', 10)
  if (Number.isFinite(n) && n >= 0 && n <= 1) return n
  return 0
}

/**
 * Language-coach Stage A turns are LIVE conversational turns just like ultra-lean speak-live
 * scenarios, but they use the FULL reply-only JSON contract (not the micro contract) because
 * coach mode needs space to teach + correct. We still want fast-fail behaviour — silently
 * waiting through `120s × 2 retries` (the heavy `getAiRequestTimeoutMs` defaults) on a hung
 * OpenAI call leaves the learner staring at "Shaping a reply…" for minutes and ultimately
 * surfacing as the harsh "Small hiccup" banner. 25s is a sane upper bound for the coach
 * reply (typical p95 is ~3-6s); env override permits 5–45s for tuning per environment.
 */
export function getSpeakLiveCoachReplyRequestTimeoutMs(): number {
  const n = Number.parseInt(process.env.SPEAK_LIVE_COACH_REPLY_TIMEOUT_MS ?? '', 10)
  if (Number.isFinite(n) && n >= 5_000 && n <= 45_000) return n
  return 25_000
}

/** Coach live turns: 0 retries — same fail-fast principle as ultra-lean live turns. */
export function getSpeakLiveCoachReplyMaxRetries(): number {
  const n = Number.parseInt(process.env.SPEAK_LIVE_COACH_REPLY_MAX_RETRIES ?? '', 10)
  if (Number.isFinite(n) && n >= 0 && n <= 1) return n
  return 0
}

/** Temperature for live turns — lower = faster sampling + more deterministic. */
export function getLiveTemperature(): number {
  const n = Number.parseFloat(process.env.LIVE_AI_TEMPERATURE ?? '')
  if (Number.isFinite(n) && n >= 0 && n <= 1) return n
  return 0.2
}

/** Max completion tokens for one chat turn (large JSON envelope). Lower can reduce latency; too low risks truncation. */
export function getConversationTurnMaxOutputTokens(): number {
  const n = Number.parseInt(process.env.AI_CONVERSATION_MAX_OUTPUT_TOKENS ?? '', 10)
  if (Number.isFinite(n) && n >= 400 && n <= 4096) return Math.floor(n)
  return 1200
}

/** Stage A — small JSON or plain reply; keep modest to reduce latency. */
export function getConversationTurnReplyMaxOutputTokens(): number {
  const n = Number.parseInt(process.env.AI_CONVERSATION_REPLY_MAX_OUTPUT_TOKENS ?? '', 10)
  if (Number.isFinite(n) && n >= 200 && n <= 2048) return Math.floor(n)
  return 520
}

/**
 * Speak Live Stage A — aggressive cap for short in-scene lines (latency + TTS).
 * Env: `AI_CONVERSATION_SPEAK_LIVE_REPLY_MAX_OUTPUT_TOKENS` (60–720).
 *
 * Budget: ~12-word Dutch sentence in JSON ≈ 40–60 tokens. 120 leaves headroom for
 * `goalHit` array and occasional longer replies without wasting generation time.
 */
export function getConversationTurnSpeakLiveReplyMaxOutputTokens(): number {
  const n = Number.parseInt(process.env.AI_CONVERSATION_SPEAK_LIVE_REPLY_MAX_OUTPUT_TOKENS ?? '', 10)
  if (Number.isFinite(n) && n >= 40 && n <= 720) return Math.floor(n)
  return 80
}

/** Stage A max tokens: tighter envelope when `speakLive` context is present (browser / voice surface). */
export function replyStageAMaxOutputTokensForRequest(request: {
  speakLive?: unknown
  scenario?: { slug?: string }
}): number {
  if (request.speakLive != null) {
    if (request.scenario?.slug && isLanguageCoachScenarioSlug(request.scenario.slug)) {
      const n = Number.parseInt(process.env.AI_CONVERSATION_LANGUAGE_COACH_REPLY_MAX_OUTPUT_TOKENS ?? '', 10)
      /**
       * Range widened from [120..720] → [120..1200] so deployments can grow the budget
       * without redeploying. The default lift from 240 → 600 was made after observing
       * production truncation of mid-sentence Dutch teaching replies (bug 2026-05-16):
       * the coach JSON envelope + `scenarioProgress` + `speakLiveSignals` already costs
       * ~60-80 tokens, leaving only ~160 tokens for `assistantReply` itself — which
       * cuts off a 2-3 sentence "what does this Dutch word mean?" teaching reply mid
       * word and surfaces as `AiValidationError → 502 LLM_ERROR → "Quick reconnect"`.
       * 600 tokens gives the coach ~500 tokens of Dutch text — plenty for the typical
       * 2-4 sentence reply without making typical p95 latency materially worse.
       */
      if (Number.isFinite(n) && n >= 120 && n <= 1200) return Math.floor(n)
      return 600
    }
    return getConversationTurnSpeakLiveReplyMaxOutputTokens()
  }
  return getConversationTurnReplyMaxOutputTokens()
}

/** Stage B — feedback + words + summary JSON. */
export function getConversationEnrichmentMaxOutputTokens(): number {
  const n = Number.parseInt(process.env.AI_CONVERSATION_ENRICHMENT_MAX_OUTPUT_TOKENS ?? '', 10)
  if (Number.isFinite(n) && n >= 300 && n <= 4096) return Math.floor(n)
  return 900
}

/** Max recent messages sent as context to the model (after the new user message is stored). Default 8 (was 24). */
export function getConversationRecentMessagesMax(): number {
  const n = Number.parseInt(process.env.AI_CONVERSATION_RECENT_MESSAGES_MAX ?? '', 10)
  if (Number.isFinite(n) && n >= 4 && n <= 40) return Math.floor(n)
  return 8
}

/** Max completion tokens for end-of-chat recap JSON. */
export function getConversationRecapMaxOutputTokens(): number {
  const n = Number.parseInt(process.env.AI_RECAP_MAX_OUTPUT_TOKENS ?? '', 10)
  if (Number.isFinite(n) && n >= 300 && n <= 4096) return Math.floor(n)
  return 1000
}

/**
 * When `true` (default), Speak Live Stage A uses {@link buildLiveSpeakMicroLlmChatMessages}
 * unless {@link useSpeakLiveLegacyUltraLeanPrompt} is on.
 * Set `SPEAK_LIVE_ULTRA_LEAN_PROMPT=0` to restore the full legacy reply-only + FSM prompt.
 */
export function useUltraLeanSpeakLivePrompt(): boolean {
  const raw = trimEnv('SPEAK_LIVE_ULTRA_LEAN_PROMPT').toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'off') return false
  return true
}

/** Normalize DB / URL scenario ids (`language-coach` → `language_coach`). */
export function normalizeScenarioSlugForAi(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, '_')
}

export function isLanguageCoachScenarioSlug(slug: string): boolean {
  return normalizeScenarioSlugForAi(slug) === 'language_coach'
}

/**
 * Whether this Speak Live turn should use the **micro / ultra-lean JSON** Stage-A path.
 * `language_coach` is excluded: guide mode needs the full coach prompt + standard reply-only JSON
 * (micro contract forbids teaching and caps length, which blocks audible correction loops).
 */
export function useUltraLeanSpeakLivePromptForScenario(scenarioSlug: string): boolean {
  if (!useUltraLeanSpeakLivePrompt()) return false
  if (isLanguageCoachScenarioSlug(scenarioSlug)) return false
  return true
}

/**
 * When `true` (default), live Stage A uses the **micro** prompt (`liveSpeakMicroLlmPrompt.ts`).
 * Set `SPEAK_LIVE_LEGACY_ULTRA_LEAN_PROMPT=1` to use the older ultra-lean prompt with train orchestration JSON.
 */
export function useSpeakLiveMicroLlmPrompt(): boolean {
  const raw = trimEnv('SPEAK_LIVE_LEGACY_ULTRA_LEAN_PROMPT').toLowerCase()
  if (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes') return false
  return true
}

/** Throws when required secrets are missing for the selected provider. */
export function assertProviderConfigReady(id: AiProviderId): void {
  if (id === 'mock') return
  if (id === 'openai') {
    if (!getOpenAiDirectConfig().apiKey) {
      throw new AiConfigurationError(
        'AI_PROVIDER=openai requires OPENAI_API_KEY (or use AI_PROVIDER=mock for offline dev).'
      )
    }
    return
  }
  if (id === 'azure-openai') {
    const c = getAzureOpenAiConversationConfig()
    if (!c.endpoint || !c.apiKey) {
      throw new AiConfigurationError(
        'AI_PROVIDER=azure-openai requires AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY.'
      )
    }
    return
  }
}

/**
 * Speak Live live turns require a real Stage-A LLM (not mock).
 * Call after confirming the thread uses `conversationSurface === 'speak_live'`.
 */
export function assertSpeakLiveConversationModelInfrastructureReady(): void {
  const id = getResolvedAiProviderId()
  if (id === 'mock') {
    throw new AiConfigurationError(
      'Speak Live requires a real conversation LLM (AI_PROVIDER cannot be mock). Set OPENAI_API_KEY and AI_PROVIDER=openai, or AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY and AI_PROVIDER=azure-openai.',
    )
  }
  assertProviderConfigReady(id)
}

/**
 * Post-session coaching LLM: uses **OpenAI** when `AI_PROVIDER=openai`, or **Azure OpenAI chat completions**
 * when `AI_PROVIDER=azure-openai` (deployments from {@link getAzureOpenAiSpeakLiveStructuredEvalDeployment} /
 * {@link getAzureOpenAiSpeakLiveSessionEvalDeployment}). Configure credentials for the active provider.
 */
export function assertSpeakLiveSessionEvaluationAiReady(): void {
  const cred = speakLiveEvalCredentialsReady()
  if (!cred.ok) {
    if (cred.reason === 'mock_provider') {
      throw new AiConfigurationError(
        'Speak Live session evaluation requires a non-mock AI setup (AI_PROVIDER cannot be mock).',
      )
    }
    if (cred.reason === 'azure_openai_not_configured') {
      throw new AiConfigurationError(
        'Speak Live session evaluation requires AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY when AI_PROVIDER=azure-openai.',
      )
    }
    throw new AiConfigurationError(
      'Speak Live session evaluation requires OPENAI_API_KEY when AI_PROVIDER=openai.',
    )
  }
}
