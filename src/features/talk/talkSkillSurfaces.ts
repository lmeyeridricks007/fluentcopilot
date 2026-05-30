import type { TalkSkillsPreview } from '@/lib/api/apiTypes'
import {
  BOOKING_RESERVATIONS_SCENARIO_ID,
  DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID,
  DOCTOR_PHARMACY_SCENARIO_ID,
  EXPLAINING_SOMETHING_SCENARIO_ID,
  HOUSING_LANDLORD_SCENARIO_ID,
  MEETING_NEW_PEOPLE_SCENARIO_ID,
  OPINIONS_DISCUSSIONS_SCENARIO_ID,
  PARTY_SOCIAL_SCENARIO_ID,
  PHONE_CALL_SCENARIO_ID,
  SMALL_TALK_SCENARIO_ID,
  STORE_SERVICE_ISSUE_SCENARIO_ID,
  STORYTELLING_SCENARIO_ID,
  SUPERMARKET_SHOP_SCENARIO_ID,
  TRAIN_STATION_CLASSIC_SCENARIO_ID,
  TRAIN_STATION_SCENARIO_ID,
  WORK_COLLEAGUE_INTERACTION_SCENARIO_ID,
} from '@/features/speak-live/speakLiveScenarios'

/** One-line scenario affordances (static, scenario-shaped — not a weakness dashboard). */
const SCENARIO_SKILL_SNIPPET: Partial<Record<string, string>> = {
  [OPINIONS_DISCUSSIONS_SCENARIO_ID]: 'Good for opinions, reasoning, and nuance',
  [EXPLAINING_SOMETHING_SCENARIO_ID]: 'Good for explaining, sequencing, and sentence structure',
  [STORYTELLING_SCENARIO_ID]: 'Good for storytelling, sequencing, and fluency',
  [PHONE_CALL_SCENARIO_ID]: 'Good for repair, pronunciation, and tight Q&A',
  [SMALL_TALK_SCENARIO_ID]: 'Good for reacting, flow, and follow-up questions',
  [MEETING_NEW_PEOPLE_SCENARIO_ID]: 'Good for introductions and follow-up questions',
  [TRAIN_STATION_SCENARIO_ID]: 'Good for questions, repair, vocabulary, and fluency',
  [TRAIN_STATION_CLASSIC_SCENARIO_ID]: 'Good for questions, repair, vocabulary, and fluency',
  [DIRECTIONS_GETTING_SOMEWHERE_SCENARIO_ID]: 'Good for route questions, repair, and vocabulary',
  [BOOKING_RESERVATIONS_SCENARIO_ID]: 'Good for clear requests, repair, and structure',
  [STORE_SERVICE_ISSUE_SCENARIO_ID]: 'Good for explaining problems calmly',
  [WORK_COLLEAGUE_INTERACTION_SCENARIO_ID]: 'Good for sentence structure, questions, and clarity',
  [DOCTOR_PHARMACY_SCENARIO_ID]: 'Good for health vocabulary and direct questions',
  [HOUSING_LANDLORD_SCENARIO_ID]: 'Good for careful wording and explaining your case',
  [PARTY_SOCIAL_SCENARIO_ID]: 'Good for lively reactions and keeping the flow',
  [SUPERMARKET_SHOP_SCENARIO_ID]: 'Good for short questions, vocabulary, and repair',
}

/**
 * 1–2 premium chips for Talk landing / hero surfaces (uses API `skillsPreview` labels).
 */
export function talkSkillPreviewChips(preview: TalkSkillsPreview | null | undefined, max = 2): string[] {
  if (!preview) return []
  const out: string[] = []
  const f = preview.focusLabel?.trim()
  const s = preview.strongestLabel?.trim()
  if (f) out.push(`Focus · ${f}`)
  if (out.length < max && s && (!f || s.toLowerCase() !== f.toLowerCase())) {
    out.push(`Strong · ${s}`)
  }
  if (out.length < max) {
    const imp = preview.lines?.find((l) => /^improving:/i.test(l.trim()))
    if (imp) {
      const cleaned = imp.replace(/^improving:\s*/i, 'Improving · ').trim()
      if (!out.some((o) => o.toLowerCase().includes(cleaned.slice(0, 12).toLowerCase()))) {
        out.push(cleaned.length > 52 ? `${cleaned.slice(0, 49)}…` : cleaned)
      }
    }
  }
  if (out.length === 0) {
    const raw = preview.lines?.[0]?.trim()
    if (raw) out.push(raw.length > 54 ? `${raw.slice(0, 51)}…` : raw)
  }
  return out.slice(0, max)
}

/** Read Aloud entry — short, sensory, delivery-oriented. */
export function readAloudEntrySkillChips(preview: TalkSkillsPreview | null | undefined, max = 2): string[] {
  if (!preview?.focusLabel?.trim()) return []
  const f = preview.focusLabel.toLowerCase()
  const out: string[] = []
  if (/pronun|sound|word|syllab|vowel|consonant/.test(f)) {
    out.push('Built around your weak sounds')
  } else if (/pac|fluency|flow|rhythm|tempo/.test(f)) {
    out.push('Good for pacing')
  } else {
    out.push(`Shaped around ${preview.focusLabel}`)
  }
  if (out.length < max && preview.strongestLabel?.trim()) {
    const s = preview.strongestLabel.toLowerCase()
    if (/pac|fluency|flow/.test(s) && !out.some((x) => x.toLowerCase().includes('pacing'))) out.push('Good for pacing')
    else if (/pronun/.test(s) && !out.some((x) => x.toLowerCase().includes('pronunciation'))) out.push('Pronunciation focus')
    else if (!preview.focusLabel.toLowerCase().includes(s.slice(0, 6))) out.push(`Strong in ${preview.strongestLabel}`)
  }
  return out.slice(0, max)
}

/** Language Coach entry — mode is free-talk; lines stay coaching-shaped. */
export function languageCoachEntrySkillChips(preview: TalkSkillsPreview | null | undefined, max = 2): string[] {
  if (!preview?.focusLabel?.trim()) return []
  const f = preview.focusLabel.toLowerCase()
  const out: string[] = []
  if (/follow|question|doorvrag/.test(f)) out.push('Best for follow-up questions')
  else if (/story|narrat/.test(f)) out.push('Good for storytelling')
  else out.push(`Adapts to ${preview.focusLabel}`)
  if (out.length < max) {
    const line = preview.lines?.find((l) => /still|reps|want|weakest/i.test(l))
    if (line) out.push(line.length > 48 ? `${line.slice(0, 45)}…` : line)
  }
  if (out.length < max && preview.strongestLabel?.trim()) {
    const s = preview.strongestLabel.trim()
    if (s.toLowerCase() !== preview.focusLabel.toLowerCase()) out.push(`Strong in ${s}`)
  }
  return out.slice(0, max)
}

/**
 * Subtle setup copy: scenario strength + optional bridge to learner focus label.
 */
export function scenarioSetupSkillHint(scenarioId: string, focusSkillLabel: string | null | undefined): string | null {
  const base = SCENARIO_SKILL_SNIPPET[scenarioId]
  const fl = focusSkillLabel?.trim()
  if (!base && !fl) return null
  if (base && fl) {
    const hint = `Recommended because you’re working on ${fl.toLowerCase()} · ${base[0]!.toLowerCase()}${base.slice(1)}.`
    return hint.length > 128 ? `${hint.slice(0, 125)}…` : hint
  }
  return base ?? (fl ? `Recommended while you sharpen ${fl.toLowerCase()}.` : null)
}
