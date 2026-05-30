import OpenAI from 'openai'
import { z } from 'zod'
import {
  getOpenAiDirectConfig,
  getResolvedAiProviderId,
  getSpeakLiveEvalParallelBatchTurns,
  getSpeakLiveEvaluationAiMaxRetries,
  getSpeakLiveEvaluationAiRequestTimeoutMs,
  getSpeakLiveReportAuditModel,
  isReportExpensiveAuditEnabled,
} from '../ai/config/aiProviderConfig'
import { WrongWordDetectionLlmSchema } from './liveSessionEvaluationLlm'
import type { TurnEvaluation, WrongWordDetection } from './liveVoiceEvaluationTypes'

const ReferenceUpdateSchema = z.object({
  referenceSentence: z.string().max(2000),
  referenceKind: z.enum(['reference_pronunciation', 'more_natural_dutch']),
  referenceSentenceReason: z.string().max(1500),
})

const ReportAuditTurnSchema = z.object({
  turnId: z.string().uuid(),
  wrongWordDetections: z.array(WrongWordDetectionLlmSchema).max(8),
  referenceUpdate: ReferenceUpdateSchema.nullable().optional(),
  improvedVersion: z.string().max(2000).optional(),
})

const ReportAuditSessionSchema = z.object({
  turns: z.array(ReportAuditTurnSchema).max(40),
})

export type ReportAuditTurnInput = {
  turnId: string
  learnerTranscript: string
  wrongWordDetections: WrongWordDetection[]
  referenceSentence: string
  referenceKind: 'reference_pronunciation' | 'more_natural_dutch'
  referenceSentenceReason: string
  improvedVersion: string | null
  mainFixLine: string
  keyProblems: string[]
}

export function isSpeakLiveReportAuditLlmEnabled(): boolean {
  return isReportExpensiveAuditEnabled()
}

const AUDIT_SYSTEM = `You are the final Dutch pedagogy auditor for Speak Live **post-session reports** (already assembled per turn).

For each turn you receive the learner transcript, the proposed word-level corrections (wrongWordDetections with observedToken → suggestedCorrection), referenceSentence, improvedVersion, mainFixLine, and keyProblems.

Your tasks (use full Dutch + pragmatics judgment — no regex shortcuts):

1. **wrongWordDetections — substitution sanity**  
   For each item, imagine applying suggestedCorrection in place of the learner’s observedToken in the **actual learner sentence** (first natural occurrence, respecting word boundaries).  
   - If **observedToken does not appear** in the learner transcript as its own word (or full phrase when multi-word), **remove** the detection — never ship “replace X with Y” when the learner did not say X.
   - If the resulting sentence is **not grammatical Dutch**, **drops the intended meaning**, or creates nonsense (e.g. double articles like “een tas een nodig”, or replacing “ook” with “een” in “Ik heb een tas ook nodig”), **remove that detection**.  
   - Remove corrections that are clearly **alignment noise** (token from one clause matched to an unrelated word elsewhere).
   - **Keep** an item when the swap produces good Dutch and the correction reflects **likely learner intent from context** (dialogue role, service scene) even if the transcript word is a valid homophone or near-homophone — do not remove only because the primary reference line used different wording.

2. **Learner role**  
   referenceSentence and improvedVersion must stay what the **customer/learner** would say, not staff dialogue. Fix if needed (same rules as a coaching QA pass).

2b. **Idiomatic Dutch**  
   When you touch referenceSentence or improvedVersion, ensure the result is **natural spoken Dutch** at the learner level (not literal translations from English, not odd collocations). Prefer the phrasing a Dutch speaker would actually use in this scene.

3. **Consistency**  
   If mainFixLine or keyProblems insist on a word swap you are removing, ensure the remaining report is still coherent — adjust optional improvedVersion / referenceUpdate so the learner still gets one clear target line when wording should change.

3b. **Non-words / ASR hallucinations**  
   If **observedToken** is not plausible Dutch in the learner sentence (clear speech-to-text garbage, wrong-language fragment, or impossible spelling for the intended meaning), **remove** that wrongWordDetection **or** replace it with one grounded in the same intent: **suggestedCorrection** must be natural Dutch the learner should aim for (from reference, improvedVersion, or scene inference).  
   Do **not** leave coaching that drills or spotlights nonsense tokens (no “practice this syllable on” a non-word).

4. **Output**  
   Return the **authoritative** wrongWordDetections array for each turn (may be empty).  
   Include **referenceUpdate** only when you change referenceSentence from the input (with kind + reason).  
   Include **improvedVersion** only when you change the grammar coach line (full string).

Return ONLY JSON: { "turns": [ { "turnId", "wrongWordDetections": [...], "referenceUpdate": null | { ... }, "improvedVersion"?: string } ] }
Every input turnId must appear exactly once.`

export type ReportAuditTurnPatch = z.infer<typeof ReportAuditTurnSchema>

async function runSpeakLiveReportAuditLlmSingleBatch(
  client: OpenAI,
  model: string,
  scenarioTitle: string,
  learnerLevel: string,
  turns: ReportAuditTurnInput[],
): Promise<Map<string, ReportAuditTurnPatch> | null> {
  if (!turns.length) return new Map()
  const payload = JSON.stringify(
    {
      scenarioTitle,
      learnerLevel,
      turns: turns.map((t) => ({
        turnId: t.turnId,
        learnerTranscript: t.learnerTranscript,
        wrongWordDetections: t.wrongWordDetections,
        referenceSentence: t.referenceSentence,
        referenceKind: t.referenceKind,
        referenceSentenceReason: t.referenceSentenceReason,
        improvedVersion: t.improvedVersion,
        mainFixLine: t.mainFixLine,
        keyProblems: t.keyProblems,
      })),
    },
    null,
    0,
  ).slice(0, 48_000)

  const maxTokens = Math.min(4500, 700 + turns.length * 420)

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: AUDIT_SYSTEM },
        { role: 'user', content: `Audit and return JSON for all turns:\n${payload}` },
      ],
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[ReportAudit] batch request failed — keeping pre-audit report', msg)
    return null
  }

  const raw = completion.choices[0]?.message?.content ?? ''
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''))
  } catch (e) {
    console.warn('[ReportAudit] batch JSON parse failed — keeping pre-audit report', e)
    return null
  }

  const r = ReportAuditSessionSchema.safeParse(parsed)
  if (!r.success) {
    console.warn('[ReportAudit] batch schema validation failed — keeping pre-audit report', r.error.message)
    return null
  }

  const expected = new Set(turns.map((t) => t.turnId))
  const out = new Map<string, ReportAuditTurnPatch>()
  for (const row of r.data.turns) {
    out.set(row.turnId, row)
  }
  for (const id of expected) {
    if (!out.has(id)) {
      console.warn('[ReportAudit] missing turn in batch — keeping pre-audit report')
      return null
    }
  }
  if (out.size !== expected.size) {
    console.warn('[ReportAudit] duplicate/extra turns in batch — keeping pre-audit report')
    return null
  }

  return out
}

/**
 * Full-report LLM audit after enrichment: validates word corrections against the real learner sentence,
 * reference role, and internal consistency. No deterministic substitution tables — model judgment only.
 * Many turns: batched parallel requests (see {@link getSpeakLiveEvalParallelBatchTurns}) to cut wall time.
 */
export async function runSpeakLiveReportAuditLlm(input: {
  scenarioTitle: string
  learnerLevel: string
  turns: ReportAuditTurnInput[]
}): Promise<Map<string, ReportAuditTurnPatch> | null> {
  if (!input.turns.length) return new Map()

  if (getResolvedAiProviderId() === 'mock') {
    console.log('[ReportAudit] skipped — AI provider is mock')
    return null
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.log('[ReportAudit] skipped — no OPENAI_API_KEY')
    return null
  }

  const cfg = getOpenAiDirectConfig()
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    maxRetries: getSpeakLiveEvaluationAiMaxRetries(),
    timeout: Math.min(120_000, getSpeakLiveEvaluationAiRequestTimeoutMs()),
  })
  const model = getSpeakLiveReportAuditModel()
  const batchSize = getSpeakLiveEvalParallelBatchTurns()

  if (input.turns.length <= batchSize) {
    const out = await runSpeakLiveReportAuditLlmSingleBatch(
      client,
      model,
      input.scenarioTitle,
      input.learnerLevel,
      input.turns,
    )
    if (out) console.log('[ReportAudit] completed', { model, turns: out.size, batched: false })
    return out
  }

  const chunks: ReportAuditTurnInput[][] = []
  for (let i = 0; i < input.turns.length; i += batchSize) {
    chunks.push(input.turns.slice(i, i + batchSize))
  }
  console.log('[ReportAudit] batched parallel', { model, batches: chunks.length, batchSize, totalTurns: input.turns.length })
  const batchResults = await Promise.all(
    chunks.map((c) =>
      runSpeakLiveReportAuditLlmSingleBatch(client, model, input.scenarioTitle, input.learnerLevel, c),
    ),
  )
  if (batchResults.some((m) => !m)) return null

  const merged = new Map<string, ReportAuditTurnPatch>()
  for (const m of batchResults as Map<string, ReportAuditTurnPatch>[]) {
    for (const [k, v] of m) merged.set(k, v)
  }
  if (merged.size !== input.turns.length) {
    console.warn('[ReportAudit] merged size mismatch — keeping pre-audit report')
    return null
  }
  console.log('[ReportAudit] completed', { model, turns: merged.size, batched: true, batches: chunks.length })
  return merged
}

export function applyReportAuditPatchToTurn(
  row: TurnEvaluation,
  patch: ReportAuditTurnPatch,
): { referenceChanged: boolean } {
  const prevRef = row.referenceSentence.trim()
  row.wrongWordDetections = patch.wrongWordDetections.length
    ? (patch.wrongWordDetections as unknown as WrongWordDetection[])
    : undefined
  row.compareListenFor = undefined
  if (patch.referenceUpdate) {
    row.referenceSentence = patch.referenceUpdate.referenceSentence
    row.referenceKind = patch.referenceUpdate.referenceKind
    row.referenceSentenceReason = patch.referenceUpdate.referenceSentenceReason
  }
  if (patch.improvedVersion !== undefined && row.languageEvaluation) {
    row.languageEvaluation = { ...row.languageEvaluation, improvedVersion: patch.improvedVersion }
  }
  return { referenceChanged: row.referenceSentence.trim() !== prevRef }
}
