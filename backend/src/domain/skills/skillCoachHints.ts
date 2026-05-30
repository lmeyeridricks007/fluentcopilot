/**
 * Internal English hints for Language Coach / free talk — extends conversation memory steer.
 */
import { getSkillDefinition } from './skillDefinitions'
import type { SkillId, UserSkillProfile } from './skillTypes'

function biasLineForSkill(id: SkillId): string | null {
  switch (id) {
    case 'follow_up_questions':
      return 'Bias: after the learner answers, add one curious follow-up before changing topic — interested friend, not an interview.'
    case 'asking_questions':
      return 'Bias: model one clean Dutch question in your reply so they can mirror word order without metalanguage.'
    case 'storytelling':
    case 'sequencing':
      return 'Bias: when they share a fragment, invite the next beat (“what happened next?” / “how did that end?”) in natural Dutch.'
    case 'nuance':
    case 'reasoning':
    case 'opinions':
    case 'contrast_comparison':
      return 'Bias: one low-stakes “why?” or “what would you compare that to?” — invite comparison or trade-offs without debate framing.'
    case 'pronunciation':
    case 'fluency':
      return 'Bias: keep your Dutch lines short and speakable; repeat-back praise; avoid stacking many corrections in one turn.'
    case 'repair_clarification':
      return 'Bias: model short repair phrases they can reuse (“nog een keer, wat bedoel je precies?”, “even checken …”).'
    case 'keeping_flow':
      return 'Bias: use soft bridges and brief reactions so the thread does not drop between turns.'
    case 'sentence_structure':
    case 'grammar':
      return 'Bias: prefer implicit recasts in a natural sentence over rule explanations.'
    case 'vocabulary':
    case 'word_choice':
      return 'Bias: recycle one or two useful words from their last turn in your reply with a fresh collocation.'
    case 'natural_dutch':
      return 'Bias: favour idiomatic chunks and particles over textbook-perfect but stiff phrasing.'
    default:
      return null
  }
}

export function buildSkillCoachInternalEnglish(skill: UserSkillProfile | null | undefined): string {
  if (!skill?.currentFocusSkills?.length && !skill?.strongestSkills?.length) {
    return ''
  }
  const focus = skill.currentFocusSkills.slice(0, 2)
  const strong = skill.strongestSkills.slice(0, 1)
  const bits: string[] = ['--- Skill profile (English; INTERNAL) ---']
  if (focus.length) {
    bits.push(
      `Skill focus (max one nudge every several turns; invite, don’t diagnose): ${focus
        .map((id) => getSkillDefinition(id).label)
        .join(' · ')}.`,
    )
    for (const id of focus) {
      const line = biasLineForSkill(id)
      if (line) bits.push(line)
    }
  }
  if (strong.length) {
    bits.push(`Echo strength subtly: ${strong.map((id) => getSkillDefinition(id).label).join(' · ')}.`)
  }
  bits.push('Never read skill labels as a checklist to the learner.')
  return bits.join(' ')
}
