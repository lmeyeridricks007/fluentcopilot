import { describe, expect, it } from 'vitest'
import {
  buildWorkColleagueInteractionScenario,
  type WorkColleagueInteractionSubtype,
  type WorkColleagueInteractionVariation,
} from './workColleagueInteractionScenario'
import {
  WORK_COLLEAGUE_FILE_DOCUMENT_LANGUAGE_POOL,
  WORK_COLLEAGUE_LEARNER_STARTER_POOLS,
  WORK_COLLEAGUE_TASK_TOPIC_POOL,
  WORK_COLLEAGUE_TIME_DEADLINE_A1,
  WORK_COLLEAGUE_WORKPLACE_ACTION_POOL,
  buildWorkColleagueVocabularyPromptSection,
  getWorkColleagueLearnerStarterPhrases,
} from './workColleagueInteractionVocabularyPools'

describe('workColleagueInteractionVocabularyPools', () => {
  it('exports task topic pool covering document … approval', () => {
    expect(WORK_COLLEAGUE_TASK_TOPIC_POOL).toContain('document')
    expect(WORK_COLLEAGUE_TASK_TOPIC_POOL).toContain('meeting_note')
    expect(WORK_COLLEAGUE_TASK_TOPIC_POOL).toContain('file_folder')
    expect(WORK_COLLEAGUE_TASK_TOPIC_POOL).toContain('task_ticket')
    expect(WORK_COLLEAGUE_TASK_TOPIC_POOL.length).toBe(10)
  })

  it('exposes workplace language and starter banks', () => {
    expect(WORK_COLLEAGUE_WORKPLACE_ACTION_POOL.length).toBeGreaterThan(6)
    expect(WORK_COLLEAGUE_TIME_DEADLINE_A1.length).toBeGreaterThan(4)
    expect(WORK_COLLEAGUE_FILE_DOCUMENT_LANGUAGE_POOL.length).toBeGreaterThan(4)
    expect(WORK_COLLEAGUE_LEARNER_STARTER_POOLS.simple_workplace_conversation.A2[0]).toContain('document')
    expect(getWorkColleagueLearnerStarterPhrases('asking_for_help', 'A2')[0]).toMatch(/helpen/)
  })

  it('buildWorkColleagueVocabularyPromptSection samples lexemes for task focus', () => {
    const lines = buildWorkColleagueVocabularyPromptSection({
      taskFocus: 'report',
      level: 'B1',
      rng: () => 0.55,
    })
    expect(lines[0]).toContain('[V]')
    expect(lines.some((l) => l.includes('Taakonderwerp (report)'))).toBe(true)
  })
})

/** Five deterministic “runs” for QA / documentation (fixed RNG). */
describe('example randomized runs (fixed rng)', () => {
  const table: readonly [number, number, 'A1' | 'A2' | 'B1', WorkColleagueInteractionSubtype, WorkColleagueInteractionVariation][] =
    [
      [1, 0.07, 'A1', 'team_task', 'simple_workplace_conversation'],
      [2, 0.23, 'A2', 'manager_or_lead_request', 'asking_for_help'],
      [3, 0.41, 'A2', 'colleague_chat', 'clarifying_tasks'],
      [4, 0.62, 'A1', 'team_task', 'asking_for_help'],
      [5, 0.88, 'B1', 'colleague_chat', 'simple_workplace_conversation'],
    ]

  it.each(table)('run #%i uses structured pools', (_n, seed, level, subType, variation) => {
    const rng = () => seed
    const runtime = buildWorkColleagueInteractionScenario({
      level,
      subType,
      variation,
      random: rng,
    })
    expect(runtime.persona && 'taskFocus' in runtime.persona).toBe(true)
    expect(WORK_COLLEAGUE_TASK_TOPIC_POOL).toContain(
      (runtime.persona as { taskFocus?: string }).taskFocus as (typeof WORK_COLLEAGUE_TASK_TOPIC_POOL)[number]
    )
    expect(runtime.hints?.length).toBeGreaterThan(0)
    expect(runtime.context).toMatch(/\[V\] Taalpool/)
  })
})
