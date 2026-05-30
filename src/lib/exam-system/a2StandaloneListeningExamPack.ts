import { seededShuffle } from './a2SpeakingExamSessionSample'
import { A2_STANDALONE_LISTENING_MCQ_POOL, getA2StandaloneListeningMcqByPoolIndex } from './a2StandaloneListeningQuestionBank'

export type A2StandaloneListeningExamSlot = {
  scenarioId: string
  scenarioTitleNl: string
  scenarioIndex1Based: number
  scenarioCount: number
  questionIndexInScenario: number
  questionsInScenario: number
  item: (typeof A2_STANDALONE_LISTENING_MCQ_POOL)[number]
}

/**
 * Picks 25 MCQs from {@link A2_STANDALONE_LISTENING_MCQ_POOL} (deterministic per session seed).
 * Prefers **distinct question stems** (`questionNl`) so the exam is not dominated by hundreds of
 * near-duplicate “vergadering” items, then fills the rest if needed. Each slot is one audio clip.
 */
export function buildA2StandaloneListeningExamSequence(sessionSeed: string): A2StandaloneListeningExamSlot[] {
  const pool = A2_STANDALONE_LISTENING_MCQ_POOL
  const poolSize = pool.length
  const perm = seededShuffle(
    Array.from({ length: poolSize }, (_, i) => i),
    sessionSeed,
    'a2-standalone-listening-draw-v3',
  )
  const seenQuestionNl = new Set<string>()
  const picked: number[] = []
  const pickedSet = new Set<number>()

  for (const bankIdx of perm) {
    if (picked.length >= 25) break
    const qn = pool[bankIdx]!.questionNl.trim()
    if (seenQuestionNl.has(qn)) continue
    seenQuestionNl.add(qn)
    picked.push(bankIdx)
    pickedSet.add(bankIdx)
  }
  for (const bankIdx of perm) {
    if (picked.length >= 25) break
    if (pickedSet.has(bankIdx)) continue
    picked.push(bankIdx)
    pickedSet.add(bankIdx)
  }

  const out: A2StandaloneListeningExamSlot[] = []
  let slot = 0
  for (const bankIdx of picked) {
    slot += 1
    const item = getA2StandaloneListeningMcqByPoolIndex(bankIdx)
    out.push({
      scenarioId: `bank-${bankIdx}`,
      scenarioTitleNl: 'Luisterfragment',
      scenarioIndex1Based: slot,
      scenarioCount: 25,
      questionIndexInScenario: 1,
      questionsInScenario: 1,
      item,
    })
  }
  if (out.length !== 25) throw new Error('A2 standalone listening: sequence length must be 25')
  return out
}
