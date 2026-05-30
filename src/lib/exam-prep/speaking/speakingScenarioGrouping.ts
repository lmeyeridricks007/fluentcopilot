/**
 * Thematic groups for Speaking training sessions (A2 exam-relevant).
 */
import { SPEAKING_TRAINING_BANK } from '@/lib/exam-prep/speaking/speakingTrainingBank'
import type { SpeakingScenarioGroupId } from '@/lib/schemas/exam/speakingTrainingItem.schema'

export const SPEAKING_SCENARIO_GROUP_LABELS: Record<
  SpeakingScenarioGroupId,
  { titleNl: string; subtitleNl: string }
> = {
  daily_life: {
    titleNl: 'Dagelijks leven',
    subtitleNl: 'Weekend, eten, routine — herkenbare examenvragen.',
  },
  transport: {
    titleNl: 'Vervoer',
    subtitleNl: 'Trein, bus, auto — voorkeuren en meningen.',
  },
  shopping: {
    titleNl: 'Winkelen',
    subtitleNl: 'Praktische situaties (bank groeit later mee).',
  },
  weather: {
    titleNl: 'Weer',
    subtitleNl: 'Mening en vergelijking — typisch A2.',
  },
  hobbies: {
    titleNl: 'Hobby’s',
    subtitleNl: 'Vrije tijd (bank groeit later mee).',
  },
  work: {
    titleNl: 'Werk',
    subtitleNl: 'Ochtendroutine en werk (uitbreidbaar).',
  },
  health: {
    titleNl: 'Gezondheid',
    subtitleNl: 'Themavragen (bank groeit later mee).',
  },
  family: {
    titleNl: 'Familie',
    subtitleNl: 'Themavragen (bank groeit later mee).',
  },
  dutch_life: {
    titleNl: 'Leven in Nederland',
    subtitleNl: 'Leren, integratie, mening over Nederland.',
  },
}

export function countItemsPerSpeakingScenarioGroup(): Record<SpeakingScenarioGroupId, number> {
  const init = {} as Record<SpeakingScenarioGroupId, number>
  for (const k of Object.keys(SPEAKING_SCENARIO_GROUP_LABELS) as SpeakingScenarioGroupId[]) {
    init[k] = 0
  }
  for (const q of SPEAKING_TRAINING_BANK) {
    init[q.scenarioGroupId] = (init[q.scenarioGroupId] ?? 0) + 1
  }
  return init
}

/**
 * Groups that have at least `minCount` items (for fixed-length sessions).
 */
export function listEligibleSpeakingScenarioGroups(minCount: number): SpeakingScenarioGroupId[] {
  const c = countItemsPerSpeakingScenarioGroup()
  return (Object.keys(c) as SpeakingScenarioGroupId[]).filter((g) => c[g] >= minCount)
}

export function getSpeakingScenarioGroupLabelNl(id: SpeakingScenarioGroupId): string {
  return SPEAKING_SCENARIO_GROUP_LABELS[id].titleNl
}
