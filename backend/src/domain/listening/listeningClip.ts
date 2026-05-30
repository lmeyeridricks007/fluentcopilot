import type { ListeningDrillType } from './listeningDrillType'
import type { ListeningLevel } from './listeningLevel'
import type { ListeningScenarioId } from './listeningScenarioId'
import type { ListeningSpeakerProfile } from './listeningSpeakerProfile'

export type ListeningClip = {
  id: string
  scenarioId: ListeningScenarioId
  category: string
  level: ListeningLevel
  drillType: ListeningDrillType
  speakerProfile: ListeningSpeakerProfile | null
  transcript: string
  normalizedTranscript: string | null
  targetMeaning: string
  keyDetails: string[]
  responseExpectation: string | null
  audioUrl: string | null
  slowerAudioUrl?: string | null
  metadata: Record<string, unknown>
}
