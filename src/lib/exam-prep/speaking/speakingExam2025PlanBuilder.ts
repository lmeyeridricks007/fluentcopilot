/**
 * DUO-oriented 2025 speaking exam structure (product simulation).
 * Uses the existing speaking bank cyclically to fill the official 16–24 range.
 */
import { shuffleDeterministic } from '@/lib/exam-prep/reading/readingTaskBuilder'
import { SPEAKING_TRAINING_BANK } from '@/lib/exam-prep/speaking/speakingTrainingBank'
import { orderSpeakingItemsForProgression } from '@/lib/exam-prep/speaking/speakingProgressionPolicy'
import type { SpeakingTrainingItem } from '@/lib/schemas/exam/speakingTrainingItem.schema'
import {
  DUO_SPEAKING_2025_DURATION_SEC,
  DUO_SPEAKING_2025_PICTURE_COUNT,
  DUO_SPEAKING_2025_QUESTION_COUNT,
  DUO_SPEAKING_2025_VIDEO_COUNT,
} from '@/lib/exam/duoExamStructure'

export type Speaking2025Section = 'video_prompt' | 'picture_task' | 'conversation_task'

export function speaking2025SectionForIndex(index: number): Speaking2025Section {
  if (index < DUO_SPEAKING_2025_VIDEO_COUNT) return 'video_prompt'
  if (index < DUO_SPEAKING_2025_VIDEO_COUNT + DUO_SPEAKING_2025_PICTURE_COUNT) return 'picture_task'
  return 'conversation_task'
}

export function sectionTitleNl(section: Speaking2025Section): string {
  switch (section) {
    case 'video_prompt':
      return 'Deel 1 — video / situatie'
    case 'picture_task':
      return 'Deel 2 — afbeelding'
    case 'conversation_task':
      return 'Deel 3 — gesprek / taalkeuze'
    default:
      return ''
  }
}

export function buildSpeaking2025QuestionList(seed: number): SpeakingTrainingItem[] {
  const base = orderSpeakingItemsForProgression([...SPEAKING_TRAINING_BANK])
  const pool = shuffleDeterministic(base, seed + 19)
  const out: SpeakingTrainingItem[] = []
  for (let i = 0; i < DUO_SPEAKING_2025_QUESTION_COUNT; i++) {
    out.push(pool[i % pool.length]!)
  }
  return out
}

export function buildSpeaking2025SectionLabels(): Speaking2025Section[] {
  return Array.from({ length: DUO_SPEAKING_2025_QUESTION_COUNT }, (_, i) => speaking2025SectionForIndex(i))
}

export { DUO_SPEAKING_2025_DURATION_SEC }
