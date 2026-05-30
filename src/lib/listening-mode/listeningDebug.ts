import { mapClipDrillTypeToPayloadKind } from '@/lib/listening-mode/listeningDrillPayloadBuilders'
import type { ListeningClip } from '@/lib/listening-mode/schema'
import type { ListeningClipAttempt } from '@/lib/listening-mode/schema'
import type { ListeningLearnerProfile } from '@/lib/listening-mode/listeningProfileStorage'

export type ListeningDebugSnapshot = {
  packId: string
  level: string
  scenarioId: string
  clipIds: string[]
  drillTypes: string[]
  speechRates: number[]
  attemptsSummary: {
    clipId: string
    correct: boolean
    playsBeforeAnswer: number
    playsSlowAfterAnswer: number
    transcriptRevealed: boolean
    tags: string[]
  }[]
  personalization: {
    dimensionStress: ListeningLearnerProfile['dimensionStress']
  }
  recommendationInputs: string[]
  /** Product drill kinds after schema→payload mapping. */
  payloadKinds: string[]
}

export function buildListeningDebugSnapshot(input: {
  packId: string
  level: string
  clips: ListeningClip[]
  attempts: ListeningClipAttempt[]
  profile: ListeningLearnerProfile
}): ListeningDebugSnapshot {
  const { packId, level, clips, attempts, profile } = input
  return {
    packId,
    level,
    scenarioId: clips[0]?.scenarioId ?? '—',
    clipIds: clips.map((c) => c.id),
    drillTypes: clips.map((c) => c.drillType),
    speechRates: clips.map((c) => c.speechRate),
    attemptsSummary: attempts.map((a) => ({
      clipId: a.clipId,
      correct: a.correct,
      playsBeforeAnswer: a.playsBeforeAnswer,
      playsSlowAfterAnswer: a.playsSlowAfterAnswer,
      transcriptRevealed: a.transcriptRevealed,
      tags: a.listeningTags,
    })),
    personalization: { dimensionStress: profile.dimensionStress },
    recommendationInputs: [
      'dimensionStress from local listening profile',
      'weakest dimension drives weak-area clip variant',
    ],
    payloadKinds: clips.map((c) => mapClipDrillTypeToPayloadKind(c.drillType)),
  }
}
