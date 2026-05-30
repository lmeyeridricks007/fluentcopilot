/**
 * Premium UX drill payloads — one discriminated union per listening drill kind.
 * Built from {@link ListeningClip} + session level (+ optional personalization context).
 */
import type { ListeningClip, ListeningDrillType, ListeningLevel } from '@/lib/listening-mode/schema'
import type { ListeningProfileDimension } from '@/lib/listening-mode/listeningSkillModel'

/** Product-facing drill ids (aligned with coach / memory naming). */
export type ListeningDrillPayloadKind =
  | 'gist'
  | 'detail'
  | 'listen_respond'
  | 'instruction'
  | 'fast_speech'
  | 'personalized_focus'

export type ListeningTtsAudio = {
  mode: 'tts'
  linesNl: string[]
  /** Effective speech rate for this band (0.72–1.12 typical). */
  rate: number
}

export type ListeningDrillAnswerOption = {
  id: string
  /** Learner-facing label (usually English; may be Dutch for natural replies). */
  label: string
}

type PayloadBase = {
  clipId: string
  scenarioId: string
  sessionLevel: ListeningLevel
  clipAuthoredLevel: ListeningLevel
  /** Original clip drill (schema) — telemetry + badges. */
  sourceDrillType: ListeningDrillType
  /** Canonical drill surface for coach copy. */
  kind: ListeningDrillPayloadKind
}

export type ListeningGistDrillPayload = PayloadBase & {
  kind: 'gist'
  audio: ListeningTtsAudio
  scenarioLabel: string
  questionPrompt: string
  acceptableAnswers: ListeningDrillAnswerOption[]
  correctAnswerId: string
  explanation: string
  /** When source is replay/reveal style pack. */
  playbackCoachNoteEn?: string | null
}

export type ListeningDetailFacet = NonNullable<ListeningClip['detailFacet']>

export type ListeningDetailTarget = {
  id: string
  facet: ListeningDetailFacet | 'other'
  promptEn: string
  /** Optional short anchor from the line (not a full spoiler). */
  anchorNl?: string | null
}

export type ListeningDetailDrillPayload = PayloadBase & {
  kind: 'detail'
  audio: ListeningTtsAudio
  scenarioLabel: string
  detailTargets: ListeningDetailTarget[]
  answerMode: 'mcq'
  answerOptions: ListeningDrillAnswerOption[]
  correctAnswerId: string
  revealExplanations: {
    summaryEn: string
    transcriptNl: string
  }
}

export type ListeningListenRespondDrillPayload = PayloadBase & {
  kind: 'listen_respond'
  audio: ListeningTtsAudio
  scenarioLabel: string
  /** Main card headline — scenario instruction. */
  taskPromptEn: string
  /** What role / move the learner should produce. */
  whatYouShouldSayNextEn: string
  acceptableShortResponses: ListeningDrillAnswerOption[]
  correctAnswerId: string
  coachExplanation: string
}

export type ListeningInstructionDrillPayload = PayloadBase & {
  kind: 'instruction'
  audio: ListeningTtsAudio
  scenarioLabel: string
  questionPromptEn: string
  sequenceStepsNl: string[]
  nextActionTargetEn: string
  answerOptions: ListeningDrillAnswerOption[]
  correctAnswerId: string
  revealExplanation: string
}

export type ListeningFastSpeechDrillPayload = PayloadBase & {
  kind: 'fast_speech'
  audio: ListeningTtsAudio
  slowerAudio: ListeningTtsAudio
  scenarioLabel: string
  target: { focus: 'gist' | 'detail'; promptEn: string }
  answerOptions: ListeningDrillAnswerOption[]
  correctAnswerId: string
  explanation: string
  reducedNaturalSpeechExplanationEn: string | null
}

export type ListeningPersonalizedFocusDrillPayload = PayloadBase & {
  kind: 'personalized_focus'
  audio: ListeningTtsAudio
  scenarioLabel: string
  reasonThisSurfacedEn: string
  weaknessTarget: { label: string; dimension: ListeningProfileDimension | null }
  selectedClips: Array<{ clipId: string; scenarioLabel: string; kind: ListeningDrillPayloadKind }>
  nextLoopRecommendation: { title: string; rationale: string; packId: string }
  questionPrompt: string
  acceptableAnswers: ListeningDrillAnswerOption[]
  correctAnswerId: string
  explanation: string
}

export type ListeningDrillPayload =
  | ListeningGistDrillPayload
  | ListeningDetailDrillPayload
  | ListeningListenRespondDrillPayload
  | ListeningInstructionDrillPayload
  | ListeningFastSpeechDrillPayload
  | ListeningPersonalizedFocusDrillPayload
