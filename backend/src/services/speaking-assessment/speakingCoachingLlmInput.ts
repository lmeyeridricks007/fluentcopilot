import { z } from 'zod'
import type { DerivedScores, PhraseTarget, RawScores, TimingAnalysis, WordAssessment } from '../../domain/speaking-assessment/speakingAssessmentCanonical'

/** Strict payload sent to the speaking-coaching LLM (grounding only — no invented scores). */
export const SpeakingCoachingLlmInputSchema = z
  .object({
    cefrLevel: z.enum(['A1', 'A2', 'B1']),
    locale: z.string(),
    scenarioName: z.string(),
    promptId: z.string(),
    expectedText: z.string(),
    transcript: z.string(),
    rawScoresFromAzure: z.object({
      pronunciation: z.number(),
      fluency: z.number(),
      completeness: z.number(),
      overall: z.number(),
      prosody: z.number().nullable(),
      accuracy: z.number(),
    }),
    /** Deterministic rhythm / stress / naturalness / intonation hints (labels + optional scores). */
    derivedRhythmAndNaturalness: z.object({
      rhythm: z.object({ score: z.number().nullable(), label: z.string(), explanation: z.string().optional() }),
      sentenceStress: z.object({ score: z.number().nullable(), label: z.string(), explanation: z.string().optional() }),
      naturalness: z.object({ score: z.number().nullable(), label: z.string(), explanation: z.string().optional() }),
      intonationGuidance: z
        .object({ score: z.number().nullable(), label: z.string(), explanation: z.string().optional() })
        .nullable(),
    }),
    verdicts: z.object({
      topLabel: z.string(),
      clarityLabel: z.string(),
      naturalnessLabel: z.string(),
    }),
    weakWords: z.array(
      z.object({
        text: z.string(),
        accuracyScore: z.number(),
        errorType: z.string(),
      })
    ),
    phraseTargets: z.array(
      z.object({
        text: z.string(),
        reason: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      })
    ),
    paceNotes: z.array(z.string()),
    sentenceLevelTimingNotes: z.array(z.string()),
    timingSummary: z.object({
      paceProfile: z.string(),
      rushedEnding: z.boolean(),
      pauseCount: z.number(),
      estimatedWpm: z.number(),
    }),
    retryTargetCandidates: z.array(z.string()).max(12),
    azureCaveats: z.array(z.string()),
  })
  .strict()

export type SpeakingCoachingLlmInput = z.infer<typeof SpeakingCoachingLlmInputSchema>

export function buildRetryTargetCandidates(input: {
  expectedText: string
  transcript: string
  phraseTargets: PhraseTarget[]
  weakWords: { text: string }[]
}): string[] {
  const out: string[] = []
  for (const p of input.phraseTargets.slice(0, 5)) {
    const t = p.text.trim()
    if (t && !out.includes(t)) out.push(t)
  }
  for (const w of input.weakWords.slice(0, 4)) {
    const t = w.text.trim()
    if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t)
  }
  const gold = input.expectedText.trim().split(/\s+/).filter(Boolean)
  if (gold.length >= 2 && gold.length <= 10) out.push(gold.join(' '))
  else if (gold.length > 10) out.push(gold.slice(0, 8).join(' '))
  const tr = input.transcript.trim().split(/\s+/).filter(Boolean)
  if (tr.length >= 2 && tr.length <= 8 && !out.some((x) => x.toLowerCase() === tr.join(' ').toLowerCase())) {
    out.push(tr.join(' '))
  }
  return out.slice(0, 12)
}

export function buildSpeakingCoachingLlmInput(params: {
  level: 'A1' | 'A2' | 'B1'
  locale: string
  scenarioName: string
  promptId: string
  expectedText: string
  transcript: string
  raw: RawScores
  derived: DerivedScores
  verdicts: { topLabel: string; clarityLabel: string; naturalnessLabel: string }
  wordAssessmentsPreLlm: WordAssessment[]
  phraseTargets: PhraseTarget[]
  timing: TimingAnalysis
  azureCaveats: string[]
}): SpeakingCoachingLlmInput {
  const weakWords = params.wordAssessmentsPreLlm
    .filter((w) => w.isWeak)
    .map((w) => ({
      text: w.text,
      accuracyScore: w.accuracyScore,
      errorType: String(w.errorType),
    }))
  const retryTargetCandidates = buildRetryTargetCandidates({
    expectedText: params.expectedText,
    transcript: params.transcript,
    phraseTargets: params.phraseTargets,
    weakWords,
  })

  const input: SpeakingCoachingLlmInput = {
    cefrLevel: params.level,
    locale: params.locale,
    scenarioName: params.scenarioName,
    promptId: params.promptId,
    expectedText: params.expectedText.trim(),
    transcript: params.transcript.trim(),
    rawScoresFromAzure: { ...params.raw },
    derivedRhythmAndNaturalness: {
      rhythm: {
        score: params.derived.rhythm.score,
        label: params.derived.rhythm.label,
        ...(params.derived.rhythm.explanation ? { explanation: params.derived.rhythm.explanation } : {}),
      },
      sentenceStress: {
        score: params.derived.sentenceStress.score,
        label: params.derived.sentenceStress.label,
        ...(params.derived.sentenceStress.explanation ? { explanation: params.derived.sentenceStress.explanation } : {}),
      },
      naturalness: {
        score: params.derived.naturalness.score,
        label: params.derived.naturalness.label,
        ...(params.derived.naturalness.explanation ? { explanation: params.derived.naturalness.explanation } : {}),
      },
      intonationGuidance: params.derived.intonationGuidance
        ? {
            score: params.derived.intonationGuidance.score,
            label: params.derived.intonationGuidance.label,
            ...(params.derived.intonationGuidance.explanation
              ? { explanation: params.derived.intonationGuidance.explanation }
              : {}),
          }
        : null,
    },
    verdicts: params.verdicts,
    weakWords,
    phraseTargets: params.phraseTargets.map((p) => ({
      text: p.text,
      reason: p.reason,
      priority: p.priority,
    })),
    paceNotes: [...params.timing.paceNotes],
    sentenceLevelTimingNotes: [...params.timing.sentenceLevelNotes],
    timingSummary: {
      paceProfile: params.timing.paceProfile,
      rushedEnding: params.timing.rushedEnding,
      pauseCount: params.timing.pauseCount,
      estimatedWpm: params.timing.estimatedWpm,
    },
    retryTargetCandidates,
    azureCaveats: params.azureCaveats.slice(0, 12),
  }
  return SpeakingCoachingLlmInputSchema.parse(input)
}
