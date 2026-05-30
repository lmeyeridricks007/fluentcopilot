import { getSkillDefinition } from './skillDefinitions'
import type { UserLearningProfile } from '../learningMemory/userLearningProfileDocument'

const COLD = 2

export type TalkSkillsPreview = {
  headline: string
  lines: string[]
  overallScore: number | null
  strongestLabel: string | null
  focusLabel: string | null
}

export function buildTalkSkillsPreview(doc: UserLearningProfile): TalkSkillsPreview | null {
  if (doc.totalSessionsObserved < COLD) return null
  const sp = doc.userSkillProfile
  if (!sp || !Object.keys(sp.metrics).length) return null

  const focusId = sp.currentFocusSkills[0] ?? sp.weakestSkills[0] ?? null
  const strongId = sp.strongestSkills[0] ?? null
  const focusLabel = focusId ? getSkillDefinition(focusId).label : null
  const strongestLabel = strongId ? getSkillDefinition(strongId).label : null

  const lines: string[] = []
  if (strongestLabel && strongId !== focusId) {
    lines.push(`Strong in ${strongestLabel.toLowerCase()}`)
  }
  if (focusLabel) {
    const m = focusId ? sp.metrics[focusId] : undefined
    if (m?.trend === 'up') {
      lines.push(`Improving: ${focusLabel.toLowerCase()}`)
    } else {
      lines.push(`Focus now: ${focusLabel.toLowerCase()}`)
    }
  }
  const rec = sp.recommendations?.primary
  if (rec?.title) {
    const t = `${rec.title}`.replace(/^best next:\s*/i, 'Best next step: ')
    if (!lines.some((l) => l.toLowerCase().includes(t.toLowerCase().slice(0, 18)))) {
      lines.push(t.length > 120 ? `${t.slice(0, 117)}…` : t)
    }
  }
  const chip = sp.recommendations?.focusChip?.subtitle?.trim()
  if (chip && !lines.some((l) => l.toLowerCase().includes(chip.toLowerCase().slice(0, 14)))) {
    lines.push(chip.length > 120 ? `${chip.slice(0, 117)}…` : chip)
  }

  return {
    headline: focusLabel ? `Your speaking profile is sharpening around ${focusLabel.toLowerCase()}.` : 'Your speaking skills are taking shape.',
    lines: lines.slice(0, 3),
    overallScore: sp.overallSkillScore,
    strongestLabel,
    focusLabel,
  }
}
