import { WRITING_TRAINING_BANK } from '@/lib/exam-prep/writing/writingTrainingBank'
import type { WritingExerciseSubtype } from '@/lib/schemas/exam/writingExam.schema'
import type { WritingTrainingItem } from '@/lib/schemas/exam/writingTrainingItem.schema'

export function listWritingTasksBySubtype(subtype: WritingExerciseSubtype): WritingTrainingItem[] {
  return WRITING_TRAINING_BANK.filter((t) => t.subtype === subtype)
}

export function pickWritingTrainingTask(subtype: WritingExerciseSubtype, seed: number = Date.now()): WritingTrainingItem {
  const pool = listWritingTasksBySubtype(subtype)
  if (pool.length === 0) {
    throw new Error(`No writing training tasks for subtype ${subtype}`)
  }
  const idx = Math.abs(Math.floor(Math.sin(seed + subtype.length * 31) * 10000)) % pool.length
  return pool[idx]!
}

export function getWritingTrainingTaskById(id: string): WritingTrainingItem | undefined {
  return WRITING_TRAINING_BANK.find((t) => t.id === id)
}
