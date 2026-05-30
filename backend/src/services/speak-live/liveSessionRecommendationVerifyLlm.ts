import OpenAI from 'openai'
import { z } from 'zod'
import {
  getOpenAiDirectConfig,
  getResolvedAiProviderId,
  getSpeakLiveEvalParallelBatchTurns,
  getSpeakLiveEvaluationAiMaxRetries,
  getSpeakLiveEvaluationAiRequestTimeoutMs,
  getSpeakLiveRecommendationVerifyModel,
  isReportRecommendationVerifyEnabled,
} from '../ai/config/aiProviderConfig'
import { WrongWordDetectionLlmSchema } from './liveSessionEvaluationLlm'
import type { LiveEvalLlmTurn } from './liveSessionEvaluationLlm'
import type { WrongWordDetection } from './liveVoiceEvaluationTypes'

const ReferenceUpdateSchema = z.object({
  referenceSentence: z.string().max(2000),
  referenceKind: z.enum(['reference_pronunciation', 'more_natural_dutch']),
  referenceSentenceReason: z.string().max(1500),
})

const VerifyTurnOutSchema = z.object({
  turnId: z.string().uuid(),
  wrongWordDetections: z.array(WrongWordDetectionLlmSchema).max(8),
  referenceUpdate: ReferenceUpdateSchema.nullable().optional(),
  improvedVersionUpdate: z.string().max(2000).optional(),
})

const VerifySessionOutSchema = z.object({
  turns: z.array(VerifyTurnOutSchema).max(40),
})

export type SpeakLiveVerifyTurnInput = {
  turnId: string
  turnIndex: number
  learnerTranscript: string
  assistantReply: string
  referenceSentence: string
  referenceKind: 'reference_pronunciation' | 'more_natural_dutch'
  referenceSentenceReason: string
  improvedVersion: string | null
  /** From primary coach — used to require a concrete shorter rewrite when length is flagged. */
  keyProblems: string[]
  proposedWrongWordDetections: WrongWordDetection[]
}

export function isSpeakLiveRecommendationVerifyEnabled(): boolean {
  return isReportRecommendationVerifyEnabled()
}

/**
 * Removes word-level “corrections” that splice tokens across two intact Dutch chunks
 * (alignment noise). Not a substitute for LLM judgment — used after verify and on merged hints.
 */
/** Opt-in regex guard (`SPEAK_LIVE_EVAL_REGEX_CROSS_PHRASE_STRIP=1`). Default: off — use {@link runSpeakLiveReportAuditLlm}. */
export function maybeStripCrossPhraseWordPairs(learnerTranscript: string, dets: WrongWordDetection[]): WrongWordDetection[] {
  if (process.env.SPEAK_LIVE_EVAL_REGEX_CROSS_PHRASE_STRIP !== '1') return dets
  return stripUnsafeCrossPhraseWordPairs(learnerTranscript, dets)
}

export function stripUnsafeCrossPhraseWordPairs(
  learnerTranscript: string,
  dets: WrongWordDetection[],
): WrongWordDetection[] {
  if (!dets.length) return dets
  const learner = learnerTranscript
  return dets.filter((d) => {
    const obs = (d.observedToken ?? '').trim()
    const sug = (d.suggestedCorrection ?? '').trim()
    if (!obs || !sug) return true
    if (/\btot\s+ziens\b/i.test(learner) && /^tot$/i.test(obs) && /^dag$/i.test(sug)) return false
    if (/\bdank\s+(je|u)\s+wel\b/i.test(learner) && /^dank$/i.test(obs) && /^denk$/i.test(sug)) return false
    if (/\bdank\s+(je|u)\s+wel\b/i.test(learner) && /^wel$/i.test(obs) && /^heb$/i.test(sug)) return false
    if (
      /\bdank\s+(je|u)\s+wel\b/i.test(learner) &&
      /\btot\s+ziens\b/i.test(learner) &&
      /^wel$/i.test(obs) &&
      /^tot$/i.test(sug)
    ) {
      return false
    }
    return true
  })
}

const VERIFY_SYSTEM = `You are a strict Dutch language QA editor for Speak Live post-session coaching.
For each turn you receive JSON: learner transcript, assistant reply (dialogue context), proposed referenceSentence, proposed wrongWordDetections, improvedVersion when present, and **keyProblems** from the primary coach.

Natural Dutch: whenever you keep or edit referenceSentence / improvedVersion, it must read as **idiomatic Dutch at the stated CEFR** (natural word choice, question particles, fixed phrases). Reject or rewrite lines that are grammatical-but-calqued, wrong question words (e.g. wat vs hoe where context demands hoe), or uncommon phrasing a Dutch speaker would not recommend here.

Your job:
1. **wrongWordDetections** — Return the final list you approve. Remove any item that is not a genuine learner mistake in this context (mis-hearings that are actually fine Dutch, misaligned tokens matched to the wrong clause, “fixes” that would break a fixed phrase, or corrections that belong to the assistant’s line instead of the learner’s). If nothing is justified, return an empty array.
   **observedToken must appear in the learner transcript** (as its own word, or the full phrase if multi-word). Remove any row where the learner never said observedToken — those are never valid coaching.
   **Contextual sound-alikes:** Keep an item when the transcript token is real Dutch but the **scene + assistant line** make it obvious the learner meant a **near-homophone** (often ASR): e.g. paying at a desk vs an unrelated homonym. Do **not** drop a correction only because referenceSentence did not spell out that token — infer intent like the primary coach.
   **Critical:** If the learner line contains both “dank je wel” / “dank u wel” and “tot ziens”, never keep a correction that replaces **wel** with **tot** (that mixes two separate phrases and is not valid Dutch). Same idea: do not “fix” **wel** using **heb** from a later “Ik heb …” clause, or **tot** using **dag** inside “tot ziens”.
2. **referenceUpdate** — Set to null if the proposed reference is already appropriate: it must be what the **learner** (customer / traveler) should say at this moment in the scene, at the stated CEFR level. If the proposed line is clearly the **assistant/staff** reply while the learner produced a **customer question**, replace it with a learner-facing question or clearer customer wording (same intent). When you replace, include referenceSentence, referenceKind, and referenceSentenceReason (one short sentence, learner-facing).
3. **improvedVersionUpdate** — When you change the grammar coach line to stay aligned with an updated reference; omit this key entirely if the existing improvedVersion text is still correct.
4. **Length / verbosity (keyProblems)** — If **keyProblems** say the line is long, wordy, “more than necessary”, could be shorter, etc., but improvedVersion is the same as the learner line (or not clearly shorter), you **must** supply **referenceUpdate** and **improvedVersionUpdate** with one **shorter Dutch learner line** that keeps the same intent (e.g. at checkout: drop a redundant “Dank je wel,” when the bag request is the point, or merge thanks + request into one short clause like “Ik heb ook een tas nodig, dank je.”). Never leave only vague length feedback without a concrete alternative.

Return ONLY JSON: { "turns": [ { "turnId", "wrongWordDetections": [...], "referenceUpdate": null | { "referenceSentence", "referenceKind", "referenceSentenceReason" }, "improvedVersionUpdate"?: string } ] }
Include every input turnId exactly once.`

async function runSpeakLiveRecommendationVerifyLlmSingleBatch(
  client: OpenAI,
  model: string,
  scenarioTitle: string,
  learnerLevel: string,
  turns: SpeakLiveVerifyTurnInput[],
): Promise<Map<string, z.infer<typeof VerifyTurnOutSchema>> | null> {
  if (!turns.length) return new Map()

  const payload = JSON.stringify(
    {
      scenarioTitle,
      learnerLevel,
      turns: turns.map((t) => ({
        turnId: t.turnId,
        turnIndex: t.turnIndex,
        learnerTranscript: t.learnerTranscript,
        assistantReply: t.assistantReply,
        referenceSentence: t.referenceSentence,
        referenceKind: t.referenceKind,
        referenceSentenceReason: t.referenceSentenceReason,
        improvedVersion: t.improvedVersion,
        keyProblems: t.keyProblems,
        proposedWrongWordDetections: t.proposedWrongWordDetections,
      })),
    },
    null,
    0,
  ).slice(0, 44_000)

  const maxTokens = Math.min(3200, 520 + turns.length * 300)

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create({
      model,
      temperature: 0.12,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: VERIFY_SYSTEM },
        {
          role: 'user',
          content: `Review and return corrected JSON for all turns:\n${payload}`,
        },
      ],
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[EvalVerify] batch request failed — using unverified merge', msg)
    return null
  }

  const raw = completion.choices[0]?.message?.content ?? ''
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''))
  } catch (e) {
    console.warn('[EvalVerify] batch JSON parse failed — using unverified merge', e)
    return null
  }

  const r = VerifySessionOutSchema.safeParse(parsed)
  if (!r.success) {
    console.warn('[EvalVerify] batch schema validation failed — using unverified merge', r.error.message)
    return null
  }

  const expectedIds = new Set(turns.map((t) => t.turnId))
  const out = new Map<string, z.infer<typeof VerifyTurnOutSchema>>()
  for (const row of r.data.turns) {
    out.set(row.turnId, row)
  }
  for (const id of expectedIds) {
    if (!out.has(id)) {
      console.warn('[EvalVerify] missing turn in batch — using unverified merge')
      return null
    }
  }
  if (out.size !== expectedIds.size) {
    console.warn('[EvalVerify] duplicate or extra turns in batch — using unverified merge')
    return null
  }

  return out
}

/**
 * Second LLM pass: validates word-level corrections and learner-facing reference copy in full context.
 * Returns a map of turnId → patch, or null if verification was skipped or failed.
 * Many turns: batched parallel requests (see {@link getSpeakLiveEvalParallelBatchTurns}) to cut wall time.
 */
export async function runSpeakLiveRecommendationVerifyLlm(input: {
  scenarioTitle: string
  learnerLevel: string
  turns: SpeakLiveVerifyTurnInput[]
}): Promise<Map<string, z.infer<typeof VerifyTurnOutSchema>> | null> {
  if (!input.turns.length) return new Map()

  if (getResolvedAiProviderId() === 'mock') {
    console.log('[EvalVerify] skipped — AI provider is mock')
    return null
  }
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    console.log('[EvalVerify] skipped — no OPENAI_API_KEY')
    return null
  }

  const cfg = getOpenAiDirectConfig()
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    maxRetries: getSpeakLiveEvaluationAiMaxRetries(),
    timeout: Math.min(90_000, getSpeakLiveEvaluationAiRequestTimeoutMs()),
  })
  const model = getSpeakLiveRecommendationVerifyModel()
  const batchSize = getSpeakLiveEvalParallelBatchTurns()

  if (input.turns.length <= batchSize) {
    const out = await runSpeakLiveRecommendationVerifyLlmSingleBatch(
      client,
      model,
      input.scenarioTitle,
      input.learnerLevel,
      input.turns,
    )
    if (out) console.log('[EvalVerify] recommendation verification completed', { model, turns: out.size, batched: false })
    return out
  }

  const chunks: SpeakLiveVerifyTurnInput[][] = []
  for (let i = 0; i < input.turns.length; i += batchSize) {
    chunks.push(input.turns.slice(i, i + batchSize))
  }
  console.log('[EvalVerify] batched parallel', { model, batches: chunks.length, batchSize, totalTurns: input.turns.length })
  const batchResults = await Promise.all(
    chunks.map((c) =>
      runSpeakLiveRecommendationVerifyLlmSingleBatch(client, model, input.scenarioTitle, input.learnerLevel, c),
    ),
  )
  if (batchResults.some((m) => !m)) return null

  const merged = new Map<string, z.infer<typeof VerifyTurnOutSchema>>()
  for (const m of batchResults as Map<string, z.infer<typeof VerifyTurnOutSchema>>[]) {
    for (const [k, v] of m) merged.set(k, v)
  }
  if (merged.size !== input.turns.length) {
    console.warn('[EvalVerify] merged size mismatch — using unverified merge')
    return null
  }
  console.log('[EvalVerify] recommendation verification completed', { model, turns: merged.size, batched: true, batches: chunks.length })
  return merged
}

export function applyRecommendationVerifyPatchesToCoach(
  learnerTranscript: string,
  coach: LiveEvalLlmTurn,
  patch: z.infer<typeof VerifyTurnOutSchema>,
): LiveEvalLlmTurn {
  const cleanedWrong = maybeStripCrossPhraseWordPairs(
    learnerTranscript,
    patch.wrongWordDetections.length ? patch.wrongWordDetections : [],
  )
  const next: LiveEvalLlmTurn = {
    ...coach,
    wrongWordDetections: cleanedWrong.length ? cleanedWrong : undefined,
  }
  if (patch.referenceUpdate) {
    next.referenceSentence = patch.referenceUpdate.referenceSentence
    next.referenceKind = patch.referenceUpdate.referenceKind
    next.referenceSentenceReason = patch.referenceUpdate.referenceSentenceReason
  }
  if (patch.improvedVersionUpdate !== undefined && coach.turnLanguageEvaluation) {
    next.turnLanguageEvaluation = {
      ...coach.turnLanguageEvaluation,
      improvedVersion: patch.improvedVersionUpdate,
    }
  }
  return next
}
