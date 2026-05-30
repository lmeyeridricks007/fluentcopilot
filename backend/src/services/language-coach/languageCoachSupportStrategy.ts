import type { SpeakLiveSupportStrategy } from '../../domain/speakLive/speakLiveSupportStrategy'
import type { LanguageCoachStyle } from '../../domain/speakLive/languageCoachSessionTypes'
import type { SkillId } from '../../domain/skills/skillTypes'

function applySkillAugmentToLanguageCoachStrategy(
  coachStyle: LanguageCoachStyle,
  base: SpeakLiveSupportStrategy,
  weakestSkillIds: SkillId[] | undefined,
): SpeakLiveSupportStrategy {
  if (!weakestSkillIds?.length) return base
  const ids = new Set(weakestSkillIds)
  const questionWeak = ids.has('follow_up_questions') || ids.has('asking_questions')
  const nuanceWeak =
    ids.has('nuance') || ids.has('reasoning') || ids.has('opinions') || ids.has('contrast_comparison')
  const storyWeak = ids.has('storytelling') || ids.has('sequencing')

  let { coachingTightness, assistanceLevel, interruptionPolicy, hintFrequency } = base

  if (coachStyle === 'supportive') {
    if (questionWeak || storyWeak) {
      if (hintFrequency === 'minimal') hintFrequency = 'normal'
    }
  } else if (coachStyle === 'balanced') {
    if (nuanceWeak && coachingTightness === 'balanced') coachingTightness = 'tight'
    if (questionWeak && hintFrequency === 'normal') hintFrequency = 'rich'
  } else if (coachStyle === 'challenging') {
    if (nuanceWeak && hintFrequency === 'normal') hintFrequency = 'rich'
  }

  return { coachingTightness, assistanceLevel, interruptionPolicy, hintFrequency }
}

export function resolveLanguageCoachSupportStrategy(
  coachStyle: LanguageCoachStyle,
  weakestSkillIds?: SkillId[],
): SpeakLiveSupportStrategy {
  let base: SpeakLiveSupportStrategy
  if (coachStyle === 'supportive') {
    base = {
      coachingTightness: 'loose',
      assistanceLevel: 'high',
      interruptionPolicy: 'defer_to_learner',
      hintFrequency: 'minimal',
    }
  } else if (coachStyle === 'challenging') {
    base = {
      coachingTightness: 'tight',
      assistanceLevel: 'standard',
      interruptionPolicy: 'coach_forward',
      hintFrequency: 'normal',
    }
  } else {
    base = {
      coachingTightness: 'balanced',
      assistanceLevel: 'standard',
      interruptionPolicy: 'balanced',
      hintFrequency: 'normal',
    }
  }
  return applySkillAugmentToLanguageCoachStrategy(coachStyle, base, weakestSkillIds)
}
