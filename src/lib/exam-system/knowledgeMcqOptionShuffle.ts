import { seededShuffle } from './a2SpeakingExamSessionSample'

export type KnowledgeMcqOption = {
  id: string
  label: string
  imageUrl?: string
}

/**
 * Randomizes display order for knowledge_mcq (KNM / reading) so the keyed correct
 * answer is not always option `a` in the first slot. Option ids are unchanged for scoring.
 */
export function knowledgeMcqOptionsShuffledForTask(
  options: readonly KnowledgeMcqOption[],
  sessionSeed: string,
  taskKey: string,
): KnowledgeMcqOption[] {
  if (options.length <= 1) return [...options]
  return seededShuffle(options, sessionSeed, `knmcq-opt:${taskKey}`)
}

/** Exam-style letter for the option row (A = first choice, B = second, …). */
export function knowledgeMcqOptionDisplayLetter(optionIndex: number): string {
  return String.fromCharCode(65 + optionIndex)
}
