import type { ListeningLevel } from './listeningLevel'
import type { ListeningScenarioId } from './listeningScenarioId'

/** A curated pack of drills (track) — first-class listening unit, not a Speak Live thread. */
export type ListeningTrack = {
  id: string
  title: string
  subtitle: string
  scenarioId: ListeningScenarioId
  defaultLevel: ListeningLevel
  clipIds: string[]
  category: string
}
