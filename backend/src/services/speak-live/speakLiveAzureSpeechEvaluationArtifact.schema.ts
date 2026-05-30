/**
 * Persisted Azure Speech (pronunciation assessment) artifacts per **user** turn.
 * Transcript is reference-only; scores reflect learner audio vs that reference.
 */
import { z } from 'zod'

export const SpeakLiveAzureSpeechWordTimingV1Schema = z.object({
  word: z.string().max(200),
  accuracyScore: z.number().min(0).max(100),
  errorType: z.string().max(120).optional(),
  startMs: z.number().optional(),
  endMs: z.number().optional(),
})

export const SpeakLiveAzureSpeechPhonemeIssueV1Schema = z.object({
  word: z.string().max(200),
  phoneme: z.string().max(64),
  accuracyScore: z.number().min(0).max(100),
  errorType: z.string().max(120).optional(),
})

export const SpeakLiveAzureSpeechPacingDetailV1Schema = z.object({
  rhythmScore: z.number().min(0).max(100),
  paceProfile: z.string().max(32),
  pauseCount: z.number().int().min(0),
  avgPauseMs: z.number().min(0),
  longestPauseMs: z.number().min(0),
  rushedEnding: z.boolean(),
  speakingDurationMs: z.number().min(0),
  totalDurationMs: z.number().min(0),
})

export const SpeakLiveAzureSpeechTurnEvaluationV1Schema = z.object({
  version: z.literal(1),
  turnId: z.string().min(1).max(80),
  /** Reference transcript text sent to Azure PA (normalized when available). */
  transcriptReference: z.string().max(8000),
  audioBlobPath: z.string().max(500).nullable(),
  /** Message / clip timestamps when known (ms epoch). */
  turnRecordedAtMs: z.number().optional(),
  clipDurationMs: z.number().optional(),
  pronunciation: z.number().min(0).max(100),
  fluency: z.number().min(0).max(100),
  completeness: z.number().min(0).max(100),
  prosody: z.number().min(0).max(100).nullable(),
  /** 0–100 composite: rhythm / pause behaviour (independent from raw Azure fluency). */
  pacing: z.number().min(0).max(100),
  pacingDetail: SpeakLiveAzureSpeechPacingDetailV1Schema,
  hesitationCount: z.number().int().min(0),
  speakingRate: z.number().min(0),
  weakWords: z.array(z.string().max(120)).max(24),
  phonemeIssues: z.array(SpeakLiveAzureSpeechPhonemeIssueV1Schema).max(64),
  omittedWords: z.array(z.string().max(120)).max(40),
  insertedWords: z.array(z.string().max(120)).max(40),
  wordTimings: z.array(SpeakLiveAzureSpeechWordTimingV1Schema).max(200),
  assessedAt: z.string().max(40),
  provider: z.literal('azure'),
})

export type SpeakLiveAzureSpeechWordTimingV1 = z.infer<typeof SpeakLiveAzureSpeechWordTimingV1Schema>
export type SpeakLiveAzureSpeechPhonemeIssueV1 = z.infer<typeof SpeakLiveAzureSpeechPhonemeIssueV1Schema>
export type SpeakLiveAzureSpeechPacingDetailV1 = z.infer<typeof SpeakLiveAzureSpeechPacingDetailV1Schema>
export type SpeakLiveAzureSpeechTurnEvaluationV1 = z.infer<typeof SpeakLiveAzureSpeechTurnEvaluationV1Schema>

export function parseSpeakLiveAzureSpeechTurnEvaluationV1(raw: unknown) {
  return SpeakLiveAzureSpeechTurnEvaluationV1Schema.safeParse(raw)
}
