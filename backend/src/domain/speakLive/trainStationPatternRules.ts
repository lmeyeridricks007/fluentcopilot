import type { TrainStationGoalId } from './trainStationGoals'

/** Semantic bucket for documentation / analytics (not stored on GoalHit). */
export type TrainSemanticGroup =
  | 'departure_time'
  | 'platform'
  | 'delay_on_time'
  | 'destination'
  | 'closing_thanks'
  | 'confirm_detail'

export type TrainMatchTier = 'exact' | 'strong' | 'possible'

export type TrainStationPatternRule = {
  group: TrainSemanticGroup
  goal: TrainStationGoalId
  tier: TrainMatchTier
  /** Applied to {@link normalizeTrainStationUtterance} output. */
  re: RegExp
}

export const TIER_CONFIDENCE: Record<TrainMatchTier, number> = {
  exact: 0.99,
  strong: 0.93,
  possible: 0.72,
}

/**
 * Grouped matchers: `tier` controls auto-hits — only `exact` and `strong` become `hits`;
 * `possible` rules populate `possibleHits` (soft hints).
 *
 * Within the same `goal`, the highest `tier` match wins (see detector).
 */
export const TRAIN_STATION_PATTERN_RULES: readonly TrainStationPatternRule[] = [
  /* --- delay / on time --- */
  {
    group: 'delay_on_time',
    goal: 'ASK_DELAY_STATUS',
    tier: 'exact',
    re: /\b(is|blijft|wordt|komt|zijn)\s+de\s+trein\s+op\s+tijd\b/,
  },
  {
    group: 'delay_on_time',
    goal: 'ASK_DELAY_STATUS',
    tier: 'exact',
    re: /\b(heeft|had|krijgt)\s+de\s+trein\s+vertraging\b/,
  },
  {
    group: 'delay_on_time',
    goal: 'ASK_DELAY_STATUS',
    tier: 'exact',
    re: /\bde\s+trein\s+heeft\s+vertraging\b/,
  },
  {
    group: 'delay_on_time',
    goal: 'ASK_DELAY_STATUS',
    tier: 'strong',
    re: /\b(trein|de\s+trein|deze\s+trein|hij|die)\b[\s\S]{0,28}\bop\s+tijd\b/,
  },
  {
    group: 'delay_on_time',
    goal: 'ASK_DELAY_STATUS',
    tier: 'strong',
    re: /\bop\s+tijd\b[\s\S]{0,28}\b(trein|de\s+trein|deze\s+trein)\b/,
  },
  {
    group: 'delay_on_time',
    goal: 'ASK_DELAY_STATUS',
    tier: 'strong',
    re: /\b(trein|de\s+trein)\b[\s\S]{0,32}\b(vertraging|vertraagd|op\s+schema)\b/,
  },
  {
    group: 'delay_on_time',
    goal: 'ASK_DELAY_STATUS',
    tier: 'strong',
    re: /\b(vertraging|vertraagd)\b[\s\S]{0,32}\b(trein|de\s+trein)\b/,
  },
  {
    group: 'delay_on_time',
    goal: 'ASK_DELAY_STATUS',
    tier: 'possible',
    re: /\b(te\s+laat|te\s+vroeg|uitval|geannuleerd|minuten\s+te\s+laat)\b[\s\S]{0,40}\b(trein|de\s+trein)\b/,
  },
  {
    group: 'delay_on_time',
    goal: 'ASK_DELAY_STATUS',
    tier: 'possible',
    re: /\b(trein|de\s+trein)\b[\s\S]{0,40}\b(te\s+laat|uitval|geannuleerd)\b/,
  },

  /* --- departure time --- */
  {
    group: 'departure_time',
    goal: 'ASK_DEPARTURE_TIME',
    tier: 'exact',
    re: /\bhoe\s+laat\s+(vertrekt|gaat|komt|rijdt)\b/,
  },
  {
    group: 'departure_time',
    goal: 'ASK_DEPARTURE_TIME',
    tier: 'exact',
    re: /\bhoe\s+laat\b[\s\S]{0,24}\b(trein|vertrek)\b/,
  },
  {
    group: 'departure_time',
    goal: 'ASK_DEPARTURE_TIME',
    tier: 'exact',
    re: /\b(op|om)\s+welke\s+tijd\b/,
  },
  {
    group: 'departure_time',
    goal: 'ASK_DEPARTURE_TIME',
    tier: 'exact',
    re: /\bwelke\s+tijd\b[\s\S]{0,20}\b(vertrekt|vertrek|trein)\b/,
  },
  {
    group: 'departure_time',
    goal: 'ASK_DEPARTURE_TIME',
    tier: 'strong',
    re: /\bwanneer\s+(vertrekt|gaat|komt|rijdt)\s+de\s+trein\b/,
  },
  {
    group: 'departure_time',
    goal: 'ASK_DEPARTURE_TIME',
    tier: 'strong',
    re: /\bwanneer\b[\s\S]{0,32}\b(vertrekt|vertrek|trein)\b/,
  },
  {
    group: 'departure_time',
    goal: 'ASK_DEPARTURE_TIME',
    tier: 'possible',
    re: /\b(op|om)\s+welk\s+moment\b[\s\S]{0,24}\b(trein|vertrek)\b/,
  },

  /* --- platform --- */
  {
    group: 'platform',
    goal: 'ASK_PLATFORM',
    tier: 'exact',
    re: /\b(van|op|naar)\s+welke?\s+(perron|spoor)\b[\s\S]{0,16}\b(vertrekt|vertrek|is|de\s+trein|trein)\b/,
  },
  {
    group: 'platform',
    goal: 'ASK_PLATFORM',
    tier: 'exact',
    re: /\b(van|op|naar)\s+welke?\s+(perron|spoor)\b/,
  },
  {
    group: 'platform',
    goal: 'ASK_PLATFORM',
    tier: 'exact',
    re: /\bwelke?\s+perron\b[\s\S]{0,12}\b(vertrekt|vertrek|de\s+trein|trein)\b/,
  },
  {
    group: 'platform',
    goal: 'ASK_PLATFORM',
    tier: 'strong',
    re: /\bwelke?\s+perron\s+is\s+het\b/,
  },
  {
    group: 'platform',
    goal: 'ASK_PLATFORM',
    tier: 'strong',
    re: /\bwelke?\s+spoor\s+is\s+het\b/,
  },
  {
    group: 'platform',
    goal: 'ASK_PLATFORM',
    tier: 'strong',
    re: /\b(welk|welke)\s+(perron|spoor)\b[\s\S]{0,20}\b(nummer|staat|is)\b/,
  },
  {
    group: 'platform',
    goal: 'ASK_PLATFORM',
    tier: 'strong',
    re: /\b(perron|spoor)\b[\s\S]{0,24}\b(welk|welke|waar|nummer)\b/,
  },
  {
    group: 'platform',
    goal: 'ASK_PLATFORM',
    tier: 'possible',
    re: /\b(perron|spoor)\s*\d{1,2}\b/,
  },
  {
    group: 'platform',
    goal: 'ASK_PLATFORM',
    tier: 'possible',
    re: /\bmet\s+welke?\s+(perron|spoor)\b/,
  },

  /* --- destination --- */
  {
    group: 'destination',
    goal: 'ASK_DESTINATION',
    tier: 'exact',
    re: /\b(naar|tot|richting)\s+[a-záàâäéèêëíìîïóòôöúùûü\-]{2,}\b/,
  },
  {
    group: 'destination',
    goal: 'ASK_DESTINATION',
    tier: 'strong',
    re: /\b(bestemming|eindbestemming)\b/,
  },
  {
    group: 'destination',
    goal: 'ASK_DESTINATION',
    tier: 'strong',
    re: /\bwaar\s+gaat\s+de\s+(trein|ze)\b/,
  },
  {
    group: 'destination',
    goal: 'ASK_DESTINATION',
    tier: 'possible',
    re: /\b(rijdt|gaat)\s+de\s+trein\s+naar\b/,
  },

  /* --- confirm --- */
  {
    group: 'confirm_detail',
    goal: 'CONFIRM_DETAIL',
    tier: 'strong',
    re: /\b(klopt|begrijp\s+ik|dus\s+de\s+trein|even\s+checken)\b/,
  },

  /* --- thanks / close --- */
  {
    group: 'closing_thanks',
    goal: 'THANK_AND_CLOSE',
    tier: 'exact',
    re: /\b(dank\s*u|bedankt|dankjewel|dank\s+je\s+wel|tot\s+ziens|prettige\s+dag|doei)\b/,
  },
  {
    group: 'closing_thanks',
    goal: 'THANK_AND_CLOSE',
    tier: 'possible',
    re: /\b(fijne\s+dag|succes|dag)\b/,
  },
] as const

/**
 * Bus / tram / metro / ticket phrasing — same {@link TrainStationGoalId} buckets as train-station
 * so slot state, recap, and evaluation stay unified.
 */
export const PUBLIC_TRANSPORT_PATTERN_RULES: readonly TrainStationPatternRule[] = [
  {
    group: 'delay_on_time',
    goal: 'ASK_DELAY_STATUS',
    tier: 'exact',
    re: /\b(heeft|had|krijgt)\s+de\s+(bus|tram|metro)\s+vertraging\b/,
  },
  {
    group: 'delay_on_time',
    goal: 'ASK_DELAY_STATUS',
    tier: 'strong',
    re: /\b(rijdt|gaat)\s+de\s+(bus|tram|metro)\b[\s\S]{0,32}\b(vandaag|op\s+tijd|vertraging|uitval)\b/,
  },
  {
    group: 'delay_on_time',
    goal: 'ASK_DELAY_STATUS',
    tier: 'strong',
    re: /\b(is|blijft)\s+de\s+metro\s+op\s+tijd\b/,
  },
  {
    group: 'platform',
    goal: 'ASK_PLATFORM',
    tier: 'exact',
    re: /\bwelke\s+(bus|tram|metro|lijn)\b[\s\S]{0,24}\b(moet|kan|wil)\s+ik\b/,
  },
  {
    group: 'platform',
    goal: 'ASK_PLATFORM',
    tier: 'strong',
    re: /\b(waar\s+is)\s+halte\b/,
  },
  {
    group: 'platform',
    goal: 'ASK_PLATFORM',
    tier: 'strong',
    re: /\b(moet\s+ik)\s+hier\s+uitstappen\b/,
  },
  {
    group: 'platform',
    goal: 'ASK_PLATFORM',
    tier: 'strong',
    re: /\b(tramhalte|metrostation|bushalte)\b/,
  },
  {
    group: 'destination',
    goal: 'ASK_DESTINATION',
    tier: 'exact',
    re: /\b(ik\s+)?wil\s+een\s+kaartje\s+naar\b/,
  },
  {
    group: 'destination',
    goal: 'ASK_DESTINATION',
    tier: 'strong',
    /** OV desk: "tram naar …" / "de metro naar …" without ticket phrasing */
    re: /\b(de\s+)?(tram|bus|metro)\s+naar\b/,
  },
  {
    group: 'confirm_detail',
    goal: 'CONFIRM_DETAIL',
    tier: 'strong',
    re: /\b(enkele\s+reis|retour)\b/,
  },
  {
    group: 'confirm_detail',
    goal: 'CONFIRM_DETAIL',
    tier: 'strong',
    re: /\b(hoeveel\s+kost|prijs|kan\s+ik\s+hier\s+pinnen|contactloos|geldig\s+voor)\b/,
  },
  {
    group: 'departure_time',
    goal: 'ASK_DEPARTURE_TIME',
    tier: 'strong',
    re: /\bhoe\s+laat\b[\s\S]{0,24}\b(bus|tram|metro)\b/,
  },
]

/** Train-station Speak Live: train + multimodal patterns for one detector pass. */
export const ALL_SPEAK_LIVE_TRANSPORT_PATTERN_RULES: readonly TrainStationPatternRule[] = [
  ...TRAIN_STATION_PATTERN_RULES,
  ...PUBLIC_TRANSPORT_PATTERN_RULES,
]

const TIER_ORDER: Record<TrainMatchTier, number> = {
  exact: 3,
  strong: 2,
  possible: 1,
}

export function compareTiers(a: TrainMatchTier, b: TrainMatchTier): number {
  return TIER_ORDER[a] - TIER_ORDER[b]
}

/** Best rule match per goal (highest tier; tie-break longer span). */
export function pickBestMatchesPerGoal(
  canonical: string,
  rules: readonly TrainStationPatternRule[]
): Map<TrainStationGoalId, { rule: TrainStationPatternRule; m: RegExpExecArray }> {
  const best = new Map<TrainStationGoalId, { rule: TrainStationPatternRule; m: RegExpExecArray }>()
  for (const rule of rules) {
    rule.re.lastIndex = 0
    const m = rule.re.exec(canonical)
    if (!m || m.index == null) continue
    const prev = best.get(rule.goal)
    if (!prev) {
      best.set(rule.goal, { rule, m })
      continue
    }
    const cmp = compareTiers(rule.tier, prev.rule.tier)
    if (cmp > 0 || (cmp === 0 && m[0].length > prev.m[0].length)) {
      best.set(rule.goal, { rule, m })
    }
  }
  return best
}
