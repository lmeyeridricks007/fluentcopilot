import type { ListeningDrillType } from './listeningDrillType'

export const LISTENING_ANSWER_MODES = ['mcq', 'tap', 'voice', 'skipped'] as const
export type ListeningAnswerMode = (typeof LISTENING_ANSWER_MODES)[number]

export type ListeningAttemptAnswer = {
  selectedIndex?: number | null
  selectedLabel?: string | null
  raw?: string | null
}

export type ListeningAttemptEvaluation = {
  correct?: boolean
  notes?: string[] | null
  tags?: string[] | null
}

export type ListeningAttempt = {
  id: string
  sessionId: string
  clipId: string
  drillType: ListeningDrillType
  answer: ListeningAttemptAnswer
  answerMode: ListeningAnswerMode
  correctGist: boolean | null
  correctDetails: boolean | null
  replayCount: number
  slowerReplayUsed: boolean
  transcriptRevealed: boolean
  responseLatencyMs: number | null
  evaluation: ListeningAttemptEvaluation | null
  createdAt: string
}
