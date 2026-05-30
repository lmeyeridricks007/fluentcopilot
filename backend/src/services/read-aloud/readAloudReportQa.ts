import OpenAI from 'openai'
import { z } from 'zod'
import { getOpenAiDirectConfig, getOpenAiEnrichmentModel } from '../ai/config/aiProviderConfig'
import type { ReadAloudSentenceReviewV2 } from './readAloudSentenceReport'

const ReportQaSchema = z.object({
  overallTranscriptMatchesPassage: z.boolean(),
  sentenceBySentenceSlicesLookUnreliable: z.boolean(),
  shortLearnerNote: z.string().min(1).max(400).nullable().optional(),
})

export type ReadAloudReportQaPack = z.infer<typeof ReportQaSchema>

/** Rules-based QA: global accuracy vs. per-line chaos usually means bad slicing, not a bad read. */
export function deterministicReadAloudReportQa(input: {
  acc01: number
  sentences: ReadAloudSentenceReviewV2[]
  /** Discounted fraction of clip (0–1) not cleanly assigned to any sentence span after softening short pauses. */
  deadZoneFraction?: number
}): string | null {
  const { acc01, sentences } = input
  if (sentences.length < 2) return null

  const dz = input.deadZoneFraction
  if (dz != null && dz > 0.26 && acc01 >= 0.52) {
    return 'Some stretches of the recording could not be tied cleanly to a printed line. That often comes from pauses, retries, or sentence transitions more than from reading the wrong passage.'
  }

  const uncertain = sentences.filter((s) => s.alignmentUncertain).length
  if (acc01 >= 0.65 && uncertain >= Math.ceil(sentences.length * 0.35)) {
    return 'Your overall wording matched the passage well, but several line-by-line slices look unreliable — trust the full transcript and pronunciation tips more than every “changed word” on each line.'
  }

  const veryShortSlice = sentences.filter((s) => {
    const spoken = s.spokenText.trim()
    if (!spoken) return false
    const tw = s.targetText.split(/\s+/).filter(Boolean).length
    if (tw < 4) return false
    const sw = spoken.split(/\s+/).filter(Boolean).length
    return sw < tw * 0.5
  }).length

  if (acc01 >= 0.6 && veryShortSlice >= Math.ceil(sentences.length * 0.4)) {
    return 'The full transcript is fairly close to the text, while a few lines look far too short — that usually means words landed on the wrong line, not that you skipped whole sections.'
  }

  return null
}

/**
 * Optional LLM pass: flags mismatch between whole-passage transcript quality and per-sentence slices.
 * Does not invent scores; only returns short learner-facing notes when conservative checks pass.
 */
export async function runReadAloudReportQaLlm(input: {
  targetText: string
  recognizedText: string
  acc01: number
  sentenceSummaries: Array<{
    index: number
    targetPreview: string
    spokenPreview: string
    alignmentUncertain?: boolean
  }>
  deadZoneFraction?: number
  evaluationMode?: string
}): Promise<ReadAloudReportQaPack | null> {
  if (input.acc01 < 0.42) return null
  if (input.sentenceSummaries.length < 2) return null

  const cfg = getOpenAiDirectConfig()
  if (!cfg.apiKey) return null

  const model = getOpenAiEnrichmentModel()
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    maxRetries: 0,
    timeout: 18_000,
  })

  const payload = {
    readingAccuracy01: input.acc01,
    targetExcerpt: input.targetText.slice(0, 2_200),
    recognizedExcerpt: input.recognizedText.slice(0, 2_200),
    lines: input.sentenceSummaries.slice(0, 24),
    deadZoneFraction: input.deadZoneFraction ?? null,
    evaluationMode: input.evaluationMode ?? 'legacy',
  }

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create({
      model,
      temperature: 0.1,
      max_tokens: 320,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You QA a Dutch read-aloud learner report. Compare the FULL recognized text to the FULL target passage, then look at per-line target vs. spoken previews. ' +
            'Return JSON only: {"overallTranscriptMatchesPassage":boolean,"sentenceBySentenceSlicesLookUnreliable":boolean,"shortLearnerNote":string|null}. ' +
            'overallTranscriptMatchesPassage: true only if the learner clearly read the same passage (allow small STT errors). ' +
            'sentenceBySentenceSlicesLookUnreliable: true if several lines\' spokenPreview clearly cannot be the words they read for that line while the full transcript still matches the passage (timing / line-split issues). ' +
            'shortLearnerNote: at most 2 short sentences in English, plain language, no vendor/algorithm jargon; null unless both booleans are true. ' +
            'Never claim the read matches if readingAccuracy01 is low and excerpts clearly disagree. Be conservative. ' +
            'If evaluationMode is "segmented_timed_llm", sentence clips were aligned with Whisper word timings plus a model — if deadZoneFraction is high, that can reflect pauses, retries, silence, or extra speech between lines. ' +
            'If deadZoneFraction is null, ignore it.',
        },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    })
  } catch {
    return null
  }

  const raw = completion.choices[0]?.message?.content?.trim()
  if (!raw) return null
  try {
    return ReportQaSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

export function mergeReportQaCaveats(input: {
  existing: string[]
  deterministicNote: string | null
  llm: ReadAloudReportQaPack | null
}): string[] {
  const out = [...input.existing]
  const push = (s: string | null | undefined) => {
    const t = s?.trim()
    if (!t) return
    if (out.some((x) => x.trim() === t)) return
    out.unshift(t)
  }
  push(input.deterministicNote)
  if (input.llm?.overallTranscriptMatchesPassage && input.llm.sentenceBySentenceSlicesLookUnreliable) {
    push(
      input.llm.shortLearnerNote ??
        'Your recording likely follows the passage; if one line shows odd words, treat it as a line-grouping issue and lean on the full clip plus pronunciation hints.',
    )
  }
  return out
}

export function readAloudQaCoachingFeedbackLine(input: {
  acc01: number
  deterministicNote: string | null
  llm: ReadAloudReportQaPack | null
}): string | null {
  if (input.acc01 < 0.62) return null
  const llmOk =
    input.llm?.overallTranscriptMatchesPassage === true &&
    input.llm.sentenceBySentenceSlicesLookUnreliable === true
  if (!input.deterministicNote && !llmOk) return null
  return 'Quality check: your overall transcript matches the passage — if a single line looks wrong, it is often how words were grouped across pauses, not how you read that line.'
}
