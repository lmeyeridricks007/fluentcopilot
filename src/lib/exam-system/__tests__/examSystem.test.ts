import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { KMN_QUIZ_QUESTIONS } from '@/lib/exam-prep/kmn/kmnSeedContent'
import { resolveKnmQuizSceneId } from '@/lib/exam-prep/kmn/knmSceneInference'
import { resolveKnmSceneId } from '@/lib/exam-prep/kmn/knmSceneResolver'
import { getExamProfile, getExamProfileByCodeAndLevel, listExamProfiles } from '../examProfileRegistry'
import { computeSimulationRunPreview } from '../examSimulationPreview'
import { A2_PART1_QUESTION_BANK } from '../a2SpeakingPart1QuestionBank'
import { A2_STANDALONE_LISTENING_MCQ_POOL } from '../a2StandaloneListeningQuestionBank'
import { buildExpandedA2KnmEntries } from '../a2KnmExamBank'
import { getA2KnmMcqByPoolIndex, getA2KnmMcqPoolLength, sampleA2KnmExamPoolIndices } from '../knmMcqBank'
import { A2_READING_EXAM_MCQ_POOL } from '../a2ReadingExamMcqBank'
import { A2_WRITING_EXAM_QUESTION_BANK } from '../a2WritingExamQuestionBank'
import { A2_WRITING_EXAM_STRATUM_ORDER, pickA2WritingStratifiedBankIndices } from '../a2WritingExamStratifiedDraw'
import { pickA2WritingSimulationTaskCount } from '../a2WritingExamSessionDraw'
import {
  informalAppBodyFromSituation,
  synthesizeA2WritingReportExampleNl,
  synthesizeWritingReportExampleForTask,
} from '../a2WritingExamSynthesizedExamples'
import { personalizeWritingFormFillIdealAnswer, idealizeDamageNarrativeSlot } from '../writingFormFillPersonalizedIdeal'
import {
  detectFormFillGrammarSpellingNotes,
  detectProseGrammarSpellingNotes,
  dutchGrammarCoachingForSentence,
  writingExamDimensionRationaleLines,
  writingExamPersonalizedFeedbackLines,
  writingFormFillDimensionRationaleLines,
  writingFormFillPersonalizedFeedbackLines,
} from '../writingFormFillReportFeedback'
import {
  composeWritingFillInAnswer,
  examTaskWithFormFillRubricIfNeeded,
  formFillAnswerUsesSeparatedFields,
  formFillLayoutScore01,
  isPlausibleFormFillSlotContent,
  writingExamTaskLooksFormFill,
  FORM_FILL_SCORING_DIMENSIONS,
  parseWritingFillInAnswer,
} from '../writingExamFillInCompose'
import { isWritingExamGibberish } from '../scoringEngine'
import { splitWritingExamPromptForDisplay } from '../writingExamPromptLayout'
import { A2_SPEAKING_LISTENING_MCQ_POOL } from '../speakingListeningMcqBank'
import { generateExamTasks } from '../taskGenerator'
import type { ExamTaskInstance } from '../types'
import { aggregateAttempts, mcqSubmissionMatchesCorrect, parseMcqSubmissionIds, scoreTaskAttempt } from '../scoringEngine'
import { computeReadiness } from '../readinessEngine'
import { buildSimulationReport, resolveSimulationReportDisplayStats } from '../reportBuilder'
import { synthesizeSpeakingReportExampleNl } from '../speakingExamSynthesizedExamples'
import { inferSpeakingModelAnswerNl } from '../speakingPromptModelAnswer'
import { calculateXP } from '@/lib/progression/xpEngine'
import { buildExamMemoryWeaknessTags } from '../examPersonalizationBridge'
import { computeExamXpBand } from '../xpExamBands'
import { deterministicExamAnswerEvaluation } from '../examAnswerEvaluation'
import {
  applyLlmAnswerEvaluationsToAttempts,
  blendHeuristicCompositeWithAnswerFit,
} from '../examSimulationLlmBlend'
import {
  appendTaskAttempt,
  createExamSession,
  finalizeExamSession,
  minTasksForXp,
  reprocessCompletedExamReport,
} from '../sessionLifecycle'
import { toProgressionSessionComplete } from '../examProgressionBridge'
import {
  computeSessionWallClockRemaining,
  formatExamClock,
  resolveSectionWallBudgetSeconds,
  resolveTotalEstimateDisplaySeconds,
  sectionPaceRemainingSeconds,
} from '../examTimerModel'
import {
  resolveAnswerAutoSubmitOnTimeout,
  sectionWallIsStrict,
  trainingPrepIsTimed,
} from '../examTimerPolicy'
import { remainingMs, createTimer, isExpired } from '../timerEngine'
import { speakingPrepAudioLine } from '../speakingPrepAudioLine'
import { preferredExamLevelFromLearner, resolveExamProfileIdForPreferredLevel } from '../examHubSelection'
import { listeningMcqDialogueLine, listeningMcqQuestionAndOptionsLine } from '../listeningMcqReadAloud'

describe('listeningMcqReadAloud', () => {
  it('uses dialogue script only for scenario line', () => {
    expect(
      listeningMcqDialogueLine({
        listeningScriptNl: 'A: Hallo. B: Dag.',
      }),
    ).toBe('A: Hallo. B: Dag.')
  })

  it('builds question plus labeled options for read-aloud', () => {
    const s = listeningMcqQuestionAndOptionsLine({
      promptNl: 'Wat zegt B?',
      mcq: {
        options: [
          { id: 'a', label: 'Ja.' },
          { id: 'b', label: 'Nee.' },
        ],
        correctOptionIds: ['a'],
      },
    })
    expect(s).toContain('De vraag luidt:')
    expect(s).toContain('Wat zegt B?')
    expect(s).toContain('Eerste keuze:')
    expect(s).toContain('Tweede keuze:')
    expect(s).toContain('Ja.')
    expect(s).toContain('Nee.')
  })
})

describe('preferredExamLevelFromLearner', () => {
  it('prefers durable profile currentLevel over session', () => {
    expect(
      preferredExamLevelFromLearner({ currentLevel: 'A1' }, { currentLevel: 'A2' } as never, 'A1'),
    ).toBe('A2')
  })

  it('prefers onboarding self-report over stale mock registry currentLevel', () => {
    expect(
      preferredExamLevelFromLearner(
        { currentLevel: 'A1' },
        { currentLevel: 'A1', currentLevelSelfReportId: 'a2' } as never,
        'A1',
      ),
    ).toBe('A2')
  })

  it('uses study context when profile has no CEFR', () => {
    expect(preferredExamLevelFromLearner({ currentLevel: '' }, null, 'B1')).toBe('B1')
  })

  it('prefers study path over stale mock profile A1 when no self-report', () => {
    expect(
      preferredExamLevelFromLearner({ currentLevel: 'A1' }, { currentLevel: 'A1' } as never, 'A2'),
    ).toBe('A2')
  })

  it('normalizes Dutch level dropdown labels from settings', () => {
    expect(
      preferredExamLevelFromLearner(
        { currentLevel: 'A0 (Beginner)' },
        { currentLevel: 'A0 (Beginner)' } as never,
        undefined,
      ),
    ).toBe('A1')
    expect(
      preferredExamLevelFromLearner({ currentLevel: 'A2' }, { currentLevel: 'A2' } as never, 'A1'),
    ).toBe('A2')
  })

  it('resolveExamProfileIdForPreferredLevel remaps URL profile to learner level', () => {
    const profiles = [
      { examId: 'inburgering_speaking_A1', examCode: 'inburgering_speaking', level: 'A1' as const },
      { examId: 'inburgering_speaking_A2', examCode: 'inburgering_speaking', level: 'A2' as const },
      { examId: 'inburgering_writing_A2', examCode: 'inburgering_writing', level: 'A2' as const },
    ]
    expect(
      resolveExamProfileIdForPreferredLevel(profiles, 'A2', {
        profileFromUrl: 'inburgering_speaking_A1',
      }),
    ).toBe('inburgering_speaking_A2')
    expect(
      resolveExamProfileIdForPreferredLevel(profiles, 'A2', {
        profileFromUrl: 'inburgering_writing_A2',
      }),
    ).toBe('inburgering_writing_A2')
  })
})

describe('speakingPrepAudioLine', () => {
  it('joins distinct scenario and assignment for TTS', () => {
    const line = speakingPrepAudioLine('Situatie: u belt de apotheek.', 'Wat zeg je in het Nederlands?')
    expect(line).toContain('apotheek')
    expect(line).toContain('Wat zeg je')
    expect(line).toContain('\n\n')
  })

  it('dedupes when prompt already contains scenario', () => {
    const prompt = 'Je belt de apotheek. Wat zeg je?'
    expect(speakingPrepAudioLine('Je belt de apotheek.', prompt)).toBe(prompt)
  })
})

describe('exam profile registry', () => {
  it('loads inburgering speaking profile', () => {
    const p = getExamProfile('inburgering_speaking_v1')
    expect(p).toBeTruthy()
    expect(p?.supportedLevels).toEqual(['A1', 'A2', 'B1'])
    expect(p?.examCode).toBe('inburgering_speaking')
    expect(listExamProfiles().length).toBe(15)
  })

  it('resolves profile by examCode + level', () => {
    const b1 = getExamProfileByCodeAndLevel('inburgering_speaking', 'B1')
    expect(b1?.level).toBe('B1')
    expect(b1?.simulationBlueprint.sections.length).toBeGreaterThan(0)
  })

  it('uses training blueprint with extra drill tasks vs simulation (A1)', () => {
    const a1 = getExamProfile('inburgering_speaking_A1')!
    const simN = generateExamTasks({
      profile: a1,
      level: 'A1',
      mode: 'simulation',
      scope: 'full',
      sessionSeed: 's',
    }).length
    const trainN = generateExamTasks({
      profile: a1,
      level: 'A1',
      mode: 'training',
      scope: 'full',
      sessionSeed: 's',
    }).length
    expect(trainN).toBeGreaterThan(simN)
  })
})

describe('task generation', () => {
  it('A2 KNM expanded bank carries stem audio script on almost every item (TTS + text)', () => {
    const expanded = buildExpandedA2KnmEntries()
    const n = expanded.filter((e) => Boolean(e.audioScriptNl?.trim())).length
    expect(n).toBeGreaterThan(expanded.length * 0.92)
  })

  it('A2 KNM expanded bank includes DUO-style voorbeeld items (concrete stems)', () => {
    const expanded = buildExpandedA2KnmEntries()
    expect(expanded.some((e) => e.questionNl.includes('Deltawerken'))).toBe(true)
    expect(expanded.some((e) => e.questionNl.includes('Verenigde Naties'))).toBe(true)
    expect(expanded.some((e) => e.questionNl.includes('Wilhelmus'))).toBe(true)
  })

  it('A2 KNM slide deck pack adds at least 100 static questions', async () => {
    const { KNM_SLIDE_DECK_QUESTION_COUNT } = await import('../knmSlideDeckQuestionsData')
    expect(KNM_SLIDE_DECK_QUESTION_COUNT).toBeGreaterThanOrEqual(100)
  })

  it('A2 KNM slide deck questions use unique deck illustration ids', async () => {
    const { KNM_SLIDE_DECK_QUESTION_ROWS } = await import('../knmSlideDeckQuestionsData')
    const {
      initSlideDeckIllustrationCatalog,
      knmSlideDeckIllustrationIdForIndex,
      getSlideDeckIllustrationConfig,
    } = await import('@/lib/exam-prep/kmn/knmSlideDeckIllustrationCatalog')
    initSlideDeckIllustrationCatalog(KNM_SLIDE_DECK_QUESTION_ROWS)
    const ids = KNM_SLIDE_DECK_QUESTION_ROWS.map((_, i) => knmSlideDeckIllustrationIdForIndex(i))
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(/^deck_s\d{3}$/)
      expect(getSlideDeckIllustrationConfig(id)?.topic).toBeTruthy()
    }
  })

  it('A2 KNM expanded bank always has four options, situational stems, and image items', () => {
    const expanded = buildExpandedA2KnmEntries()
    expect(expanded.every((e) => e.options.length === 4)).toBe(true)
    expect(expanded.every((e) => e.options.map((o) => o.id).join('') === 'abcd')).toBe(true)
    const babyFever = expanded.filter((e) => /baby.*koorts/i.test(e.questionNl))
    expect(babyFever.length).toBeGreaterThan(0)
    for (const item of babyFever) {
      expect(item.questionNl).not.toMatch(/politie.*aangifte/i)
      const correct = item.options.find((o) => item.correctOptionIds.includes(o.id))!
      expect(correct.label).toMatch(/huisarts/i)
      expect(correct.label).not.toMatch(/acute brand/i)
    }
    const concreteStems = expanded.filter(
      (e) =>
        e.questionNl.length > 55 &&
        !e.questionNl.includes('Je hebt te maken met') &&
        !e.questionNl.includes('Daarbij speelt ook'),
    ).length
    expect(concreteStems).toBeGreaterThan(280)
    expect(expanded.filter((e) => e.questionNl.includes('KNM (A2)')).length).toBe(0)
    expect(expanded.every((e) => Boolean(e.illustrationId?.trim()))).toBe(true)
    for (const cat of [
      'zorg_gezondheid',
      'werk_inkomen',
      'onderwijs_opvoeding',
      'wonen_buurt',
      'overheid_recht',
      'integratie_cultuur',
      'veiligheid_hulp',
      'geld_belasting_verzekering',
    ] as const) {
      expect(expanded.some((e) => e.category === cat && e.illustrationId)).toBe(true)
    }
  })

  it('KMN seed quiz questions resolve to local realistic scene WebP', () => {
    const missing: string[] = []
    for (const q of KMN_QUIZ_QUESTIONS) {
      const sceneId = resolveKnmQuizSceneId(q)
      const path = join(process.cwd(), 'public/images/knm', `${sceneId}.webp`)
      if (!existsSync(path)) missing.push(`${q.id}:${sceneId}`)
    }
    expect(missing).toEqual([])
  })

  it('A2 KNM full pool resolves to local realistic scene WebP for every question', () => {
    const missing: string[] = []
    const n = getA2KnmMcqPoolLength()
    for (let i = 0; i < n; i++) {
      const e = getA2KnmMcqByPoolIndex(i)
      expect(e.illustrationId?.trim()).toBeTruthy()
      const sceneId = resolveKnmSceneId(e.illustrationId, e.questionNl)
      const path = join(process.cwd(), 'public/images/knm', `${sceneId}.webp`)
      if (!existsSync(path)) missing.push(`${i}:${sceneId}`)
    }
    expect(missing).toEqual([])
  })

  it('generates KNM MCQ tasks with correctOptionIds (single or multi)', () => {
    const profile = getExamProfile('inburgering_knm_A2')!
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'training',
      scope: 'section',
      sectionId: 'knm_mcq',
      sessionSeed: 'mcq-seed',
    })
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks.every((t) => t.taskType === 'knowledge_mcq')).toBe(true)
    for (const t of tasks) {
      expect(t.mcq?.correctOptionIds?.length).toBeGreaterThan(0)
      expect(t.mcq?.options?.length).toBeGreaterThan(0)
      expect(t.mcq?.illustrationId?.trim()).toBeTruthy()
    }
  })

  it('A2 KNM full simulation is 40 MCQs in 45 minutes with pool for unique draws', () => {
    expect(getA2KnmMcqPoolLength()).toBeGreaterThanOrEqual(40)
    const profile = getExamProfile('inburgering_knm_A2')!
    expect(profile.simulationBlueprint.totalEstimateSeconds).toBe(45 * 60)
    const seed = 'a2-knm-full'
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'full',
      sessionSeed: seed,
    })
    expect(tasks).toHaveLength(40)
    expect(tasks.every((t) => t.taskType === 'knowledge_mcq' && t.sectionId === 'a2_knm_examen')).toBe(true)
    const sumSec = tasks.reduce((s, t) => s + t.prepSeconds + t.answerSeconds, 0)
    expect(sumSec).toBe(45 * 60)
    const knmPicks = sampleA2KnmExamPoolIndices(seed)
    expect(new Set(knmPicks).size).toBe(40)
    const withStemAudio = tasks.filter((t) => Boolean(t.listeningScriptNl?.trim())).length
    expect(withStemAudio).toBe(40)
    const knmMean = (c: number) => (c * 0.93 + (40 - c) * 0.18) / 40
    expect(profile.ui.passReadiness.readyAbove).toBeCloseTo(knmMean(26), 5)
    expect(profile.ui.passReadiness.borderlineAbove).toBeCloseTo(knmMean(23), 5)
  })

  it('A2 KNM exam section run uses 40 MCQs in 45 minutes like full simulation', () => {
    const profile = getExamProfile('inburgering_knm_A2')!
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_knm_examen',
      sessionSeed: 'knm-section-seed',
    })
    expect(tasks).toHaveLength(40)
    expect(tasks.every((t) => t.taskType === 'knowledge_mcq' && t.sectionId === 'a2_knm_examen')).toBe(true)
    const sumSec = tasks.reduce((s, t) => s + t.prepSeconds + t.answerSeconds, 0)
    expect(sumSec).toBe(45 * 60)
  })

  it('generates level-scoped tasks for section', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_speaking_part1',
      sessionSeed: 'test-seed',
    })
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks[0].level).toBe('A2')
    expect(tasks[0].promptNl.length).toBeGreaterThan(3)
  })

  it('draws 12 unique Part 1 prompts from the bank (deterministic per session seed)', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const seed = 'variety-seed-fixed'
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_speaking_part1',
      sessionSeed: seed,
    })
    expect(tasks).toHaveLength(12)
    expect(new Set(tasks.map((t) => t.promptNl)).size).toBe(12)
    const again = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_speaking_part1',
      sessionSeed: seed,
    })
    expect(again.map((t) => t.promptNl)).toEqual(tasks.map((t) => t.promptNl))
  })

  it('A2 Part 1 and Part 2 question banks each have 100+ items', () => {
    expect(A2_PART1_QUESTION_BANK.length).toBeGreaterThanOrEqual(100)
    expect(A2_SPEAKING_LISTENING_MCQ_POOL.length).toBeGreaterThanOrEqual(100)
  })

  it('A2 standalone listening MCQ bank has 200+ items', () => {
    expect(A2_STANDALONE_LISTENING_MCQ_POOL.length).toBeGreaterThanOrEqual(200)
  })

  it('A2 writing exam bank has 150+ prompts', () => {
    expect(A2_WRITING_EXAM_QUESTION_BANK.length).toBeGreaterThanOrEqual(150)
  })

  it('A2 reading exam MCQ bank has 150+ items for varied 25-question draws', () => {
    expect(A2_READING_EXAM_MCQ_POOL.length).toBeGreaterThanOrEqual(150)
  })

  it('A2 reading exam bank has unique passages (no template-grid duplicates)', () => {
    const passageBlock = /\n\n\u201c([^\u201d]+)\u201d\n\n/
    const passages = A2_READING_EXAM_MCQ_POOL.map((it) => {
      const m = it.questionNl.match(passageBlock)
      return m?.[1] ?? it.questionNl
    })
    expect(new Set(passages).size).toBe(A2_READING_EXAM_MCQ_POOL.length)
    expect(A2_READING_EXAM_MCQ_POOL.every((it) => it.passageEn?.trim())).toBe(true)
  })

  it('A2 reading full simulation is 25 MCQs in 65 minutes from the reading bank', () => {
    const profile = getExamProfile('inburgering_reading_A2')!
    expect(profile.simulationBlueprint.totalEstimateSeconds).toBe(65 * 60)
    expect(profile.simulationBlueprint.sections[0]?.id).toBe('a2_reading_examen')
    expect(profile.simulationBlueprint.sections[0]?.tasks[0]?.count).toBe(25)
    const seed = 'a2-reading-sim'
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'full',
      sessionSeed: seed,
    })
    expect(tasks).toHaveLength(25)
    expect(tasks.every((t) => t.taskType === 'knowledge_mcq' && t.sectionId === 'a2_reading_examen')).toBe(true)
    expect(tasks.every((t) => t.mcq?.options?.length)).toBe(true)
    const sumSec = tasks.reduce((s, t) => s + t.prepSeconds + t.answerSeconds, 0)
    expect(sumSec).toBe(65 * 60)
    const again = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'full',
      sessionSeed: seed,
    })
    expect(again.map((t) => t.promptNl)).toEqual(tasks.map((t) => t.promptNl))
    expect(profile.ui.passReadiness.readyAbove).toBeCloseTo(18 / 25, 5)
    expect(new Set(tasks.map((t) => t.promptNl)).size).toBe(25)
  })

  it('A2 reading section simulation is still 25 MCQs (exam hub uses section scope)', () => {
    const profile = getExamProfile('inburgering_reading_A2')!
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_reading_examen',
      sessionSeed: 'hub-reading-quick',
    })
    expect(tasks).toHaveLength(25)
    expect(tasks.reduce((s, t) => s + t.prepSeconds + t.answerSeconds, 0)).toBe(65 * 60)
    expect(new Set(tasks.map((t) => t.promptNl)).size).toBe(25)
  })

  it('A2 reading section simulation expands when sectionId is a training-only id (hub fallback to leesexamen)', () => {
    const profile = getExamProfile('inburgering_reading_A2')!
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'literal',
      sessionSeed: 'hub-reading-fallback',
    })
    expect(tasks).toHaveLength(25)
    expect(tasks.every((t) => t.sectionId === 'a2_reading_examen')).toBe(true)
  })

  it('A2 writing simulation draws 4 bank tasks in ~40 minutes (official-style count)', () => {
    const profile = getExamProfile('inburgering_writing_A2')!
    expect(profile.simulationBlueprint.totalEstimateSeconds).toBe(40 * 60)
    expect(profile.simulationBlueprint.sections[0]?.id).toBe('a2_writing_examen')
    const seed = 'a2-writing-structure'
    const n = pickA2WritingSimulationTaskCount(seed)
    expect(n).toBe(4)
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'full',
      sessionSeed: seed,
    })
    expect(tasks).toHaveLength(4)
    expect(tasks.every((t) => t.taskType === 'writing_task_exam' && t.sectionId === 'a2_writing_examen')).toBe(true)
    const sumSec = tasks.reduce((s, t) => s + t.prepSeconds + t.answerSeconds, 0)
    expect(sumSec).toBe(40 * 60)
    const again = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'full',
      sessionSeed: seed,
    })
    expect(again.map((t) => t.promptNl)).toEqual(tasks.map((t) => t.promptNl))
  })

  it('A2 writing section simulation also uses the 4-task bank (hub quick start)', () => {
    const profile = getExamProfile('inburgering_writing_A2')!
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_writing_examen',
      sessionSeed: 'hub-writing-quick',
    })
    expect(tasks).toHaveLength(4)
    expect(new Set(tasks.map((t) => t.promptNl)).size).toBe(4)
  })

  it('A2 writing simulation uses exam-style rubric weights and adequacy-heavy heuristics', () => {
    const profile = getExamProfile('inburgering_writing_A2')!
    expect(profile.simulationBlueprint.sections[0]?.tasks[0]?.scoringDimensions).toEqual([
      'task_completion',
      'natural_wording',
      'grammar_control',
      'structure',
      'politeness',
    ])
    const w = profile.scoring.overlaysByTask.writing_task_exam?.weights
    expect(w?.task_completion).toBe(50)
    expect(
      (w?.natural_wording ?? 0) + (w?.grammar_control ?? 0) + (w?.structure ?? 0) + (w?.politeness ?? 0),
    ).toBe(50)

    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_writing_examen',
      sessionSeed: 'scoring-a2-writing-weights',
    })
    const task =
      tasks.find((t) => t.writingExamStratum !== 'form_fill') ??
      tasks.find((t) => !t.writingFillInBulletsNl?.length) ??
      tasks[0]!
    const thin = scoreTaskAttempt({
      task,
      answerText: 'ja',
      blueprint: profile.scoring,
      level: 'A2',
      mode: 'simulation',
      retriesUsed: 0,
    })
    const solid = scoreTaskAttempt({
      task,
      answerText:
        'Geachte mevrouw,\n\nIk wil graag een afspraak maken. Ik ben vandaag thuis geweest en ik werk morgen.\n\nMet vriendelijke groet,\nJan',
      blueprint: profile.scoring,
      level: 'A2',
      mode: 'simulation',
      retriesUsed: 0,
    })
    expect(solid.composite).toBeGreaterThan(thin.composite + 0.1)
    expect((solid.scores.task_completion ?? 0) > (thin.scores.task_completion ?? 0)).toBe(true)
  })

  it('A2 writing simulation scores nonsense answers very low (honest rubric)', () => {
    const profile = getExamProfile('inburgering_writing_A2')!
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_writing_examen',
      sessionSeed: 'scoring-a2-writing-gibberish',
    })
    const task =
      tasks.find((t) => (t.scoringDimensions ?? []).includes('politeness')) ??
      tasks.find((t) => t.writingExamStratum !== 'form_fill') ??
      tasks[0]!
    const trash = scoreTaskAttempt({
      task,
      answerText: 'fff',
      blueprint: profile.scoring,
      level: 'A2',
      mode: 'simulation',
      retriesUsed: 0,
    })
    expect(trash.composite).toBeLessThan(0.22)
    expect(trash.scores.task_completion ?? 1).toBeLessThan(0.18)
    for (const d of task.scoringDimensions) {
      expect(trash.scores[d] ?? 1).toBeLessThan(0.26)
    }
  })

  it('A2 writing form-fill uses field-based rubric (no politeness) and scores filler low', () => {
    const profile = getExamProfile('inburgering_writing_A2')!
    const task: ExamTaskInstance = {
      id: 'form-t',
      taskType: 'writing_task_exam',
      sectionId: 'a2_writing_examen',
      level: 'A2',
      promptNl: 'Bibliotheekpas',
      promptEn: '',
      prepSeconds: 1,
      answerSeconds: 1,
      scoringDimensions: ['task_completion', 'completeness', 'structure', 'grammar_control', 'relevance'],
      writingExamStratum: 'form_fill',
      writingFillInBulletsNl: ['Uw naam', 'Uw adres', 'In één zin: reden (bibliotheekpas)'],
    }
    const bad = scoreTaskAttempt({
      task,
      answerText: 'Uw naam:\nLee\n\nUw adres:\n232 32\n\nIn één zin: reden (bibliotheekpas):\nfdsfd',
      blueprint: profile.scoring,
      level: 'A2',
      mode: 'simulation',
      retriesUsed: 0,
    })
    expect(bad.scores.politeness).toBeUndefined()
    expect(bad.composite).toBeLessThan(0.42)
    expect((bad.scores.relevance ?? 1) < 0.45).toBe(true)
  })

  it('deterministic prompt-fit: MCQ wrong selection is partial, not empty', () => {
    const task: ExamTaskInstance = {
      id: 'mcq-1',
      taskType: 'knowledge_mcq',
      sectionId: 'a2_knm_examen',
      level: 'A2',
      promptNl: 'Test?',
      promptEn: '',
      prepSeconds: 1,
      answerSeconds: 1,
      scoringDimensions: ['listening_accuracy'],
      mcq: {
        options: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        correctOptionIds: ['b'],
      },
    }
    const attempt = {
      taskId: task.id,
      taskType: task.taskType,
      sectionId: task.sectionId,
      answerText: 'a',
      submittedAt: new Date().toISOString(),
      retriesUsed: 0,
      scores: {},
      composite: 0.2,
      mode: 'simulation' as const,
    }
    const ev = deterministicExamAnswerEvaluation(task, attempt, 'A2')
    expect(ev.fit).toBe('partial')
    expect(ev.source).toBe('deterministic')
  })

  it('form-fill dimension rationale does not trash a short A2 library motivation', () => {
    const task: ExamTaskInstance = {
      id: 'lib-form',
      taskType: 'writing_task_exam',
      sectionId: 'a2_writing_examen',
      level: 'A2',
      promptNl: 'Bibliotheekpas',
      promptEn: '',
      prepSeconds: 1,
      answerSeconds: 1,
      scoringDimensions: ['task_completion', 'completeness', 'structure', 'grammar_control', 'relevance'],
      writingExamStratum: 'form_fill',
      writingFillInBulletsNl: ['Uw naam', 'Uw adres', 'In één zin: reden van uw aanvraag (bibliotheekpas)'],
    }
    const answer =
      'Uw naam:\nLee\n\nUw adres:\n242 Turfschip, 1186XV, Amstelveen\n\nIn één zin: reden van uw aanvraag (bibliotheekpas):\nIk wil graag meer lezen.'
    const lines = writingFormFillDimensionRationaleLines(
      task,
      answer,
      { relevance: 0.56, grammar_control: 0.66 },
      'A2',
    )
    expect(lines.some((l) => /does not clearly explain|not believable/i.test(l))).toBe(false)
  })

  it('deterministic prompt-fit: placeholder off-topic writing is "no" not partial', () => {
    const prompt = `Op kantoor is het koffiezetapparaat kapot gegaan; jij hebt een reservekan op de afdelingsgroep gelegd.

Schrijf een kort briefje of interne mail (maximaal vijf zinnen) aan je collega’s op dezelfde afdeling: wat er aan de hand is en wat ze in de tussentijd kunnen doen.`
    const task: ExamTaskInstance = {
      id: 'w-off',
      taskType: 'writing_task_exam',
      sectionId: 'a2_writing_examen',
      level: 'A2',
      promptNl: prompt,
      promptEn: '',
      prepSeconds: 1,
      answerSeconds: 1,
      scoringDimensions: ['task_completion', 'grammar_control'],
      writingExamStratum: 'short_note',
    }
    const attempt = {
      taskId: task.id,
      taskType: task.taskType,
      sectionId: task.sectionId,
      answerText: 'bla bla ba\nDit is niet correct. Jij moet dit niet doen.',
      submittedAt: new Date().toISOString(),
      retriesUsed: 0,
      scores: { task_completion: 0.2, grammar_control: 0.5 },
      composite: 0.25,
      mode: 'simulation' as const,
    }
    const ev = deterministicExamAnswerEvaluation(task, attempt, 'A2')
    expect(ev.fit).toBe('no')
    expect(ev.feedbackEn).toMatch(/does not address|filler/i)
    expect(ev.feedbackEn).not.toMatch(/thin relative/i)
  })

  it('synthesizes short-note koffie sample (not generic Geachte scaffold)', () => {
    const prompt = `Op kantoor is het koffiezetapparaat kapot gegaan; jij hebt een reservekan op de afdelingsgroep gelegd.

Schrijf een kort briefje of interne mail (maximaal vijf zinnen) aan je collega’s op dezelfde afdeling: wat er aan de hand is en wat ze in de tussentijd kunnen doen.`
    const { text, isScaffold } = synthesizeA2WritingReportExampleNl(prompt)
    expect(isScaffold).toBe(false)
    expect(text.toLowerCase()).toMatch(/koffie|reservekan/)
    expect(text).not.toMatch(/Hierbij reageer ik op uw bericht/)
  })

  it('deterministic prompt-fit: informal app with on-topic short answer is not marked thin', () => {
    const prompt = `Je stuurt een app-bericht naar een vriendin. Je wilt kort en duidelijk melden dat je de boodschappen meeneemt.

Schrijf een kort app-bericht in het Nederlands aan een vriendin waarin je dit meldt.`
    const task: ExamTaskInstance = {
      id: 'w-app',
      taskType: 'writing_task_exam',
      sectionId: 'a2_writing_examen',
      level: 'A2',
      promptNl: prompt,
      promptEn: '',
      prepSeconds: 1,
      answerSeconds: 1,
      scoringDimensions: ['task_completion', 'grammar_control', 'politeness'],
    }
    const attempt = {
      taskId: task.id,
      taskType: task.taskType,
      sectionId: task.sectionId,
      answerText:
        'Hoi Nadine\n\nIk wil je laat weten dat ik de boodschappen gaan meenemen. Moet ik nog iets anders doen?\n\nGroete\nLee',
      submittedAt: new Date().toISOString(),
      retriesUsed: 0,
      scores: { grammar_control: 0.65, task_completion: 0.8 },
      composite: 0.72,
      mode: 'simulation' as const,
    }
    const ev = deterministicExamAnswerEvaluation(task, attempt, 'A2')
    expect(ev.fit).not.toBe('partial')
    expect(ev.feedbackEn).not.toMatch(/thin relative/i)
    expect(ev.feedbackEn).not.toMatch(/who, what, when, why/i)
  })

  it('deterministic prompt-fit: writing gibberish is "no"', () => {
    const task: ExamTaskInstance = {
      id: 'w-1',
      taskType: 'writing_task_exam',
      sectionId: 'a2_writing_examen',
      level: 'A2',
      promptNl: 'Schrijf een korte mail.',
      promptEn: '',
      prepSeconds: 1,
      answerSeconds: 1,
      scoringDimensions: ['task_completion', 'grammar_control'],
    }
    const attempt = {
      taskId: task.id,
      taskType: task.taskType,
      sectionId: task.sectionId,
      answerText: 'fdaf dsa',
      submittedAt: new Date().toISOString(),
      retriesUsed: 0,
      scores: {},
      composite: 0.1,
      mode: 'simulation' as const,
    }
    const ev = deterministicExamAnswerEvaluation(task, attempt, 'A2')
    expect(ev.fit).toBe('no')
  })

  it('infers form bullets from the answer and upgrades a legacy mail rubric (no politeness)', () => {
    const profile = getExamProfile('inburgering_writing_A2')!
    const task: ExamTaskInstance = {
      id: 'legacy-form',
      taskType: 'writing_task_exam',
      sectionId: 'a2_writing_examen',
      level: 'A2',
      promptNl: 'Kort',
      promptEn: '',
      prepSeconds: 1,
      answerSeconds: 1,
      scoringDimensions: ['task_completion', 'structure', 'grammar_control', 'natural_wording', 'politeness'],
    }
    const answer = `Uw naam:\nLee\n\nUw adres:\n232 32 332 32\n\nIn één zin: reden van uw aanvraag (bibliotheekpas):\nfdsfd`
    const upgraded = examTaskWithFormFillRubricIfNeeded(task, answer)
    expect(upgraded.scoringDimensions).toEqual(FORM_FILL_SCORING_DIMENSIONS)
    expect(upgraded.writingFillInBulletsNl?.length).toBeGreaterThanOrEqual(2)
    const scored = scoreTaskAttempt({
      task: upgraded,
      answerText: answer,
      blueprint: profile.scoring,
      level: 'A2',
      mode: 'simulation',
      retriesUsed: 0,
    })
    expect(scored.scores.politeness).toBeUndefined()
    expect(scored.scores.natural_wording).toBeUndefined()
    expect(scored.composite).toBeLessThan(0.48)
  })

  it('A2 writing stratified draw picks one bank item per official-style category', () => {
    const idx = pickA2WritingStratifiedBankIndices('seed-strata-integration', A2_WRITING_EXAM_QUESTION_BANK)
    expect(idx).toHaveLength(4)
    expect(new Set(idx).size).toBe(4)
    idx.forEach((i, slot) => {
      expect(A2_WRITING_EXAM_QUESTION_BANK[i]?.stratum).toBe(A2_WRITING_EXAM_STRATUM_ORDER[slot])
    })
  })

  it('pickA2WritingSimulationTaskCount is always 4', () => {
    for (let k = 0; k < 20; k += 1) {
      expect(pickA2WritingSimulationTaskCount(`seed-${k}`)).toBe(4)
    }
  })

  it('synthesizes a natural wonen-mail sample for service-cost questions', () => {
    const prompt = `Situatie (wonen): Een vraag over servicekosten. Je wilt dit netjes en schriftelijk melden aan de huismeester.

Schrijf een korte mail in het Nederlands aan de huismeester over deze kwestie.`
    const { text, isScaffold } = synthesizeA2WritingReportExampleNl(prompt)
    expect(isScaffold).toBe(false)
    expect(text).toMatch(/Ik heb een vraag over servicekosten/i)
    expect(text).toMatch(/servicekosten\.\s+Ik verneem/i)
    expect(text).not.toMatch(/melden: een vraag over servicekosten Ik/i)
  })

  it('synthesizes a complete informal app sample for boodschappen (not broken “ik ben … meeneemt”)', () => {
    const prompt = `Je stuurt een app-bericht naar een vriendin. Je wilt kort en duidelijk melden dat je de boodschappen meeneemt.

Schrijf een kort app-bericht in het Nederlands aan een vriendin waarin je dit meldt.`
    const { text, isScaffold } = synthesizeA2WritingReportExampleNl(prompt)
    expect(isScaffold).toBe(false)
    expect(text).toMatch(/Hoi!/i)
    expect(text.toLowerCase()).toMatch(/neem de boodschappen mee/)
    expect(text).toMatch(/kom vanavond|langs/i)
    expect(text).not.toMatch(/ik ben de boodschappen meeneemt/i)
    expect(text).not.toMatch(/\(Aan:/i)
    expect(text).toMatch(/Groetjes,\s*\nJan de Vries/s)
    const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => /[a-z]/i.test(s))
    expect(sentences.length).toBeGreaterThanOrEqual(2)
  })

  it('informalAppBodyFromSituation covers all bank app situatie phrases', () => {
    expect(informalAppBodyFromSituation('dat je de boodschappen meeneemt')).toMatch(
      /neem de boodschappen mee.*(langs|vanavond)/i,
    )
    expect(informalAppBodyFromSituation('dat je te laat bent voor de afspraak')).toMatch(/later|te laat/i)
    expect(informalAppBodyFromSituation('dat je ziek bent en niet meegaat naar het feest')).toMatch(/ziek|feest/i)
  })

  it('synthesizes a concrete Dutch sample for institution+need writing prompts (no ellipsis template)', () => {
    const prompt = `Je richt je tot de sportschool. Je hebt het volgende nodig: een klacht over lawaai tijdens bouwwerkzaamheden. Je wilt beleefd en bondig zijn.

Schrijf een korte mail in het Nederlands aan de sportschool waarin je dit verzoek of deze vraag uitlegt.`
    const { text, isScaffold } = synthesizeA2WritingReportExampleNl(prompt)
    expect(isScaffold).toBe(false)
    expect(text).toContain('Geachte')
    expect(text.toLowerCase()).toContain('klacht')
    expect(text).not.toMatch(/\.{3,}|Hierbij …/)
  })

  it('grammar rationale lists concrete mistakes from learner text (not generic postcode tip)', () => {
    const bullets = ['Uw voor- en achternaam', 'Polisnummer (fictief mag)', 'Wat er gebeurd is en wanneer (twee korte zinnen)']
    const values = [
      'Lee Meyeridricks',
      '383838383833838',
      'Mijn buurman heb zijn auto teen mij muur gerijden. Dit gebeurt gisteren.',
    ]
    const answer = composeWritingFillInAnswer(bullets, values)
    const notes = detectFormFillGrammarSpellingNotes(bullets, values)
    expect(notes.length).toBeGreaterThanOrEqual(3)
    expect(notes.some((n) => /heeft|heb/i.test(n.message))).toBe(true)
    expect(notes.some((n) => /tegen|teen/i.test(n.message))).toBe(true)
    const task: ExamTaskInstance = {
      id: 'w-grammar',
      sectionId: 'a2_writing_examen',
      taskType: 'writing_task_exam',
      promptNl: 'Schadeformulier',
      promptEn: '',
      prepSeconds: 60,
      answerSeconds: 600,
      scoringDimensions: FORM_FILL_SCORING_DIMENSIONS,
      writingFillInBulletsNl: bullets,
      writingExamStratum: 'form_fill',
    }
    const lines = writingFormFillDimensionRationaleLines(task, answer, { grammar_control: 0.48 }, 'A2')
    const grammar = lines.find((l) => l.startsWith('Grammar & spelling'))
    expect(grammar).toBeDefined()
    expect(grammar).toMatch(/heeft|tegen|mijn muur|gereden|gebeurde/i)
    expect(grammar).not.toMatch(/Hoofdstraat 12, 1234 AB Amstelveen/)
    expect(grammar).toMatch(/On “.*\n• /s)
  })

  it('informal app with Hoi and Groete scores politeness fairly (not formal-mail rules)', () => {
    const profile = getExamProfile('inburgering_writing_A2')!
    const task: ExamTaskInstance = {
      id: 'w-app-pol',
      sectionId: 'a2_writing_examen',
      taskType: 'writing_task_exam',
      promptNl:
        'Je stuurt een app-bericht naar een vriendin. Je wilt kort en duidelijk melden dat je de boodschappen meeneemt.\n\nSchrijf een kort app-bericht.',
      promptEn: '',
      prepSeconds: 1,
      answerSeconds: 1,
      scoringDimensions: ['politeness'],
      writingExamStratum: 'informal_social',
    }
    const answer =
      'Hoi Nadine\n\nIk neem de boodschappen mee.\n\nGroete\nLee'
    const scored = scoreTaskAttempt({
      task,
      answerText: answer,
      blueprint: profile.scoring,
      level: 'A2',
      mode: 'simulation',
      retriesUsed: 0,
    })
    expect((scored.scores.politeness ?? 0) * 100).toBeGreaterThanOrEqual(55)
  })

  it('informal app politeness tips mention Groetjes not Geachte', () => {
    const prompt = `Je stuurt een app-bericht naar een vriendin. Je wilt kort en duidelijk melden dat je de boodschappen meeneemt.

Schrijf een kort app-bericht in het Nederlands aan een vriendin waarin je dit meldt.`
    const task: ExamTaskInstance = {
      id: 'w-app-tone',
      sectionId: 'a2_writing_examen',
      taskType: 'writing_task_exam',
      promptNl: prompt,
      promptEn: '',
      prepSeconds: 60,
      answerSeconds: 600,
      scoringDimensions: ['task_completion', 'grammar_control', 'politeness'],
      writingExamStratum: 'informal_social',
    }
    const answer =
      'Hoi Nadine\n\nIk wil je laten weten dat ik de boodschappen meeneem.\n\nGroete\nLee'
    const lines = writingExamDimensionRationaleLines(task, answer, { politeness: 0.44 }, 'A2')
    const tone = lines.find((l) => l.startsWith('Tone & greetings'))
    expect(tone).toBeDefined()
    expect(tone).toMatch(/Hoi|Groetjes|informal app/i)
    expect(tone).not.toMatch(/Geachte heer\/mevrouw/)
  })

  it('prose email writing tips name concrete grammar issues in How to improve', () => {
    const answer = `Geachte heer/mevrouw,

Ik heb een vraag over de servicekosten van mijn woning. Mijn buurman heb zijn auto teen mij muur gerijden. Dit gebeurt gisteren.

Met vriendelijke groet,
Lee Meyeridricks`
    const notes = detectProseGrammarSpellingNotes(answer)
    expect(notes.length).toBeGreaterThanOrEqual(3)
    expect(notes.some((n) => /heeft|heb/i.test(n.message))).toBe(true)
    expect(notes.some((n) => /tegen|teen/i.test(n.message))).toBe(true)

    const task: ExamTaskInstance = {
      id: 'w-email',
      sectionId: 'a2_writing_examen',
      taskType: 'writing_task_exam',
      promptNl:
        'Je richt je tot de verhuurder. Je hebt een vraag over servicekosten. Schrijf een korte formele mail in het Nederlands.',
      promptEn: '',
      prepSeconds: 60,
      answerSeconds: 600,
      scoringDimensions: ['task_completion', 'structure', 'grammar_control', 'natural_wording', 'politeness'],
      writingExamStratum: 'short_message',
    }
    const lines = writingExamDimensionRationaleLines(task, answer, { grammar_control: 0.69 }, 'A2')
    const grammar = lines.find((l) => l.startsWith('Grammar & spelling'))
    expect(grammar).toBeDefined()
    expect(grammar).toMatch(/heeft|tegen|mijn muur|gereden|gebeurde/i)

    const tips = writingExamPersonalizedFeedbackLines(task, answer)
    expect(tips.length).toBeGreaterThan(0)
    expect(tips.join('\n')).toMatch(/heeft|tegen|mijn|gebeurde/i)
  })

  it('form-fill layout rationale does not ask for labels when using multi-box compose', () => {
    const bullets = ['Uw voor- en achternaam', 'Polisnummer (fictief mag)', 'Wat er gebeurd is en wanneer (twee korte zinnen)']
    const values = ['Test User', '383838383833838', 'Mijn buurman heeft met zijn auto tegen mijn muur gereden. Dit gebeurde gisteren.']
    const answer = composeWritingFillInAnswer(bullets, values)
    expect(formFillAnswerUsesSeparatedFields(answer, bullets)).toBe(true)
    const task: ExamTaskInstance = {
      id: 'w-layout',
      sectionId: 'a2_writing_examen',
      taskType: 'writing_task_exam',
      promptNl: 'Schadeformulier',
      promptEn: '',
      prepSeconds: 60,
      answerSeconds: 600,
      scoringDimensions: FORM_FILL_SCORING_DIMENSIONS,
      writingFillInBulletsNl: bullets,
      writingExamStratum: 'form_fill',
    }
    const lines = writingFormFillDimensionRationaleLines(task, answer, { structure: 0.65 }, 'A2')
    expect(lines.some((l) => /Form layout/i.test(l))).toBe(false)
  })

  it('prompt-fit blend does not drag multi-box form layout score down', () => {
    const bullets = ['Uw voor- en achternaam', 'Polisnummer (fictief mag)', 'Wat er gebeurd is en wanneer (twee korte zinnen)']
    const answer = composeWritingFillInAnswer(bullets, [
      'Lee Meyeridricks',
      '383838383833838',
      'Mijn buurman heb zijn auto teen mij muur gerijden. Dit gebeurde gisteren.',
    ])
    const task: ExamTaskInstance = {
      id: 'w-layout-blend',
      sectionId: 'a2_writing_examen',
      taskType: 'writing_task_exam',
      promptNl: 'Schade',
      promptEn: '',
      prepSeconds: 1,
      answerSeconds: 1,
      scoringDimensions: FORM_FILL_SCORING_DIMENSIONS,
      writingFillInBulletsNl: bullets,
      writingExamStratum: 'form_fill',
    }
    const profile = getExamProfile('inburgering_writing_A2')!
    const session = createExamSession({
      userId: 'u1',
      profileId: profile.examId,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_writing_examen',
    })!
    const scored = scoreTaskAttempt({
      task,
      answerText: answer,
      blueprint: profile.scoring,
      level: 'A2',
      mode: 'simulation',
      retriesUsed: 0,
    })
    expect(formFillLayoutScore01(answer, bullets)).toBe(1)
    expect(writingExamTaskLooksFormFill(task, answer)).toBe(true)
    expect(scored.scores.structure).toBe(1)
    const withAttempt = appendTaskAttempt(
      { ...session, tasks: [task] },
      {
        taskId: task.id,
        answerText: answer,
        composite: scored.composite,
        scores: scored.scores,
        retriesUsed: 0,
      },
    )!
    const out = applyLlmAnswerEvaluationsToAttempts(withAttempt, {
      [task.id]: {
        taskId: task.id,
        fit: 'partial',
        confidence01: 0.78,
        feedbackEn: 'Some grammar issues in the narrative.',
      },
    })
    expect((out[0]!.scores.structure ?? 0) >= 0.9).toBe(true)
  })

  it('prompt-fit does not label fictional policy numbers as random characters', () => {
    const bullets = ['Uw voor- en achternaam', 'Polisnummer (fictief mag)', 'Wat er gebeurd is en wanneer (twee korte zinnen)']
    const answer = composeWritingFillInAnswer(bullets, [
      'Lee Meyeridricks',
      '383838383833838',
      'Mijn buurman heeft met zijn auto tegen mijn muur gereden. Dit gebeurde gisteren.',
    ])
    const task: ExamTaskInstance = {
      id: 'w-polis-fit',
      sectionId: 'a2_writing_examen',
      taskType: 'writing_task_exam',
      promptNl: 'Schade melden.',
      promptEn: '',
      prepSeconds: 60,
      answerSeconds: 600,
      scoringDimensions: FORM_FILL_SCORING_DIMENSIONS,
      writingFillInBulletsNl: bullets,
      writingExamStratum: 'form_fill',
    }
    const attempt = {
      taskId: task.id,
      taskType: task.taskType,
      answerText: answer,
      composite: 0.5,
      scores: {},
      retriesUsed: 0,
      submittedAt: new Date().toISOString(),
    }
    const ev = deterministicExamAnswerEvaluation(task, attempt, 'A2')
    expect(ev.gapsEn?.join(' ') ?? '').not.toMatch(/random characters/i)
  })

  it('does not flag fictional policy numbers as non-Dutch gibberish', () => {
    const label = 'Polisnummer (fictief mag)'
    const body = '383838383833838'
    expect(isWritingExamGibberish(body)).toBe(true)
    expect(isPlausibleFormFillSlotContent(label, body)).toBe(true)
    const task: ExamTaskInstance = {
      id: 'w-polis',
      sectionId: 'a2_writing_examen',
      taskType: 'writing_task_exam',
      promptNl: 'Je meldt schade. Vul polisnummer in (fictief mag).',
      promptEn: '',
      prepSeconds: 60,
      answerSeconds: 600,
      scoringDimensions: FORM_FILL_SCORING_DIMENSIONS,
      writingFillInBulletsNl: ['Uw voor- en achternaam', label, 'Wat er gebeurd is en wanneer (twee korte zinnen)'],
      writingExamStratum: 'form_fill',
    }
    const answer = [
      'Uw voor- en achternaam:',
      'Test User',
      '',
      `${label}:`,
      body,
      '',
      'Wat er gebeurd is en wanneer (twee korte zinnen):',
      'Mijn buurman heeft met zijn auto tegen mijn muur gereden. Dit gebeurde gisteren.',
    ].join('\n')
    const tips = writingFormFillPersonalizedFeedbackLines(task, answer)
    expect(tips.some((t) => /does not read as meaningful Dutch/i.test(t) && t.includes('Polisnummer'))).toBe(
      false,
    )
    expect(tips.some((t) => /fictional policy numbers are allowed/i.test(t))).toBe(true)
  })

  it('synthesizes insurance form-fill sample with labeled fields matching bullets', () => {
    const bullets = ['Uw voor- en achternaam', 'Polisnummer (fictief mag)', 'Wat er gebeurd is en wanneer (twee korte zinnen)']
    const task: ExamTaskInstance = {
      id: 'w-syn-form',
      sectionId: 'a2_writing_examen',
      taskType: 'writing_task_exam',
      promptNl: 'Je meldt een kleine schade bij je aansprakelijkheidsverzekering.',
      promptEn: '',
      prepSeconds: 1,
      answerSeconds: 1,
      scoringDimensions: FORM_FILL_SCORING_DIMENSIONS,
      writingFillInBulletsNl: bullets,
      writingExamStratum: 'form_fill',
    }
    const { text, isScaffold } = synthesizeWritingReportExampleForTask(task)
    expect(isScaffold).toBe(false)
    expect(text).toContain('Uw voor- en achternaam:\n')
    expect(text).toContain('heeft met zijn auto')
    expect(text).not.toMatch(/^Geachte heer/i)
  })

  it('personalizes insurance damage form-fill ideal from learner text', () => {
    const userAnswer = [
      'Uw voor- en achternaam:',
      'Lee Meyeridricks',
      '',
      'Polisnummer (fictief mag):',
      '383838383833838',
      '',
      'Wat er gebeurd is en wanneer (twee korte zinnen):',
      'Mijn buurman heb zijn auto teen mij muur gerijden. Mijn muur is kapot.',
    ].join('\n')
    const prompt = `Je meldt een kleine schade bij je aansprakelijkheidsverzekering.

Vul in: uw voor- en achternaam, polisnummer (fictief mag) en in twee korte zinnen wat er gebeurd is en wanneer.`
    const task: ExamTaskInstance = {
      id: 'w1',
      sectionId: 'a2_writing_examen',
      taskType: 'writing_task_exam',
      promptNl: prompt,
      promptEn: '',
      prepSeconds: 60,
      answerSeconds: 600,
      scoringDimensions: ['task_completion', 'completeness', 'structure', 'grammar_control', 'relevance'],
      writingFillInBulletsNl: [
        'Uw voor- en achternaam',
        'Polisnummer (fictief mag)',
        'Wat er gebeurd is en wanneer (twee korte zinnen)',
      ],
      writingExamStratum: 'form_fill',
    }
    const { text, isPersonalized } = personalizeWritingFormFillIdealAnswer(task, userAnswer)
    expect(isPersonalized).toBe(true)
    expect(text).toContain('Lee Meyeridricks')
    expect(text).toContain('383838383833838')
    expect(text).toContain('heeft')
    expect(text).toContain('tegen mijn muur')
    expect(text).not.toContain('fietsen')
    const ideal = idealizeDamageNarrativeSlot('Mijn buurman heb zijn auto teen mij muur gerijden. Mijn muur is kapot.')
    expect(ideal).toMatch(/heeft/)
    expect(ideal).toMatch(/tegen mijn muur/)
    expect(dutchGrammarCoachingForSentence('Mijn buurman heb zijn auto teen mij muur gerijden.').length).toBeGreaterThan(
      0,
    )
  })

  it('splitWritingExamPromptForDisplay separates assignment from checklist footer', () => {
    const nl = `Situatie (werk): test.

Schrijf een korte mail.

Zo schrijf je je antwoord (alleen Nederlands):
• Eerste punt.
• Tweede punt.`
    const parts = splitWritingExamPromptForDisplay(nl)
    expect(parts).not.toBeNull()
    expect(parts!.assignment).toContain('Situatie (werk)')
    expect(parts!.assignment).toContain('Schrijf een korte mail')
    expect(parts!.situationDisplayNl).toBe(parts!.assignment)
    expect(parts!.fillInBulletsNl).toEqual([])
    expect(parts!.answerSkeletonNl).toBeNull()
    expect(parts!.checklistTitle).toBe('Zo schrijf je je antwoord (alleen Nederlands)')
    expect(parts!.checklistItems).toEqual(['Eerste punt.', 'Tweede punt.'])
  })

  it('composeWritingFillInAnswer round-trips with parseWritingFillInAnswer', () => {
    const bullets = ['Uw naam', 'Uw adres', 'In één zin: reden (bibliotheekpas)']
    const values = ['Jan Jansen', 'Hoofdstraat 1\n1234 AB Stad', 'Ik wil graag kinderboeken lenen.']
    const stored = composeWritingFillInAnswer(bullets, values)
    const back = parseWritingFillInAnswer(bullets, stored)
    expect(back).not.toBeNull()
    expect(back).toEqual(values)
  })

  it('parseWritingFillInAnswer returns null for legacy free-form text', () => {
    const bullets = ['Uw naam', 'Uw adres']
    expect(parseWritingFillInAnswer(bullets, 'Een losse zin zonder labels.')).toBeNull()
  })

  it('A2 speaking full simulation follows official 12 + 12 structure', () => {
    const profile = getExamProfile('inburgering_speaking_A2')!
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'full',
      sessionSeed: 'a2-structure',
    })
    expect(tasks).toHaveLength(24)
    const p1 = tasks.filter((t) => t.sectionId === 'a2_speaking_part1')
    const p2 = tasks.filter((t) => t.sectionId === 'a2_speaking_part2')
    expect(p1).toHaveLength(12)
    expect(p2).toHaveLength(12)
    expect(p2.every((t) => t.taskType === 'listening_mcq_exam')).toBe(true)
    expect(p1.every((t) => !t.mcq?.options?.length)).toBe(true)
    expect(p2.every((t) => Boolean(t.listeningScriptNl?.trim() && t.mcq?.options?.length))).toBe(true)
  })

  it('A2 listening (standalone) draws 25 unique MCQs from the bank and ~45 min budget', () => {
    const profile = getExamProfile('inburgering_listening_A2')!
    expect(profile.simulationBlueprint.totalEstimateSeconds).toBe(45 * 60)
    expect(profile.simulationBlueprint.sections[0]?.tasks[0]?.count).toBe(25)
    const seed = 'a2-listen-structure'
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'full',
      sessionSeed: seed,
    })
    expect(tasks).toHaveLength(25)
    expect(tasks.every((t) => t.taskType === 'listening_mcq_exam')).toBe(true)
    expect(tasks.every((t) => t.listeningScenarioId?.startsWith('bank-') && t.listeningScenarioCount === 25)).toBe(
      true,
    )
    const bankIndices = tasks.map((t) => Number((t.listeningScenarioId ?? '').replace(/^bank-/, '')))
    expect(bankIndices.every((n) => Number.isFinite(n))).toBe(true)
    expect(new Set(bankIndices).size).toBe(25)
    expect(new Set(tasks.map((t) => t.listeningScenarioId)).size).toBe(25)
    const again = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'full',
      sessionSeed: seed,
    })
    expect(again.map((t) => t.promptNl)).toEqual(tasks.map((t) => t.promptNl))
  })
})

describe('KNM MCQ helpers', () => {
  it('parses comma-separated MCQ submissions in sorted order', () => {
    expect(parseMcqSubmissionIds('c,a')).toEqual(['a', 'c'])
    expect(parseMcqSubmissionIds(' b , a , b ')).toEqual(['a', 'b'])
  })

  it('matches single-select answers', () => {
    expect(mcqSubmissionMatchesCorrect(['b'], 'b')).toBe(true)
    expect(mcqSubmissionMatchesCorrect(['b'], 'a')).toBe(false)
    expect(mcqSubmissionMatchesCorrect(['b'], 'b,a')).toBe(false)
  })

  it('matches multi-select answers exactly (order-free)', () => {
    expect(mcqSubmissionMatchesCorrect(['a', 'c'], 'c,a')).toBe(true)
    expect(mcqSubmissionMatchesCorrect(['a', 'c'], 'a')).toBe(false)
    expect(mcqSubmissionMatchesCorrect(['a', 'c'], 'a,c,d')).toBe(false)
  })
})

describe('scoring', () => {
  it('blends Azure voice snapshot into A2 dimensions when provided', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const task = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_speaking_part1',
      sessionSeed: 'voice-blend',
    })[0]
    const answerText =
      'Ik geef een uitgebreid antwoord met meerdere zinnen zodat de scoring engine voldoende tekst heeft om te beoordelen.'
    const base = scoreTaskAttempt({
      task,
      answerText,
      blueprint: profile.scoring,
      level: 'A2',
      mode: 'simulation',
      retriesUsed: 0,
    })
    const withVoice = scoreTaskAttempt({
      task,
      answerText,
      blueprint: profile.scoring,
      level: 'A2',
      mode: 'simulation',
      retriesUsed: 0,
      voice: {
        pronunciation01: 0.88,
        fluency01: 0.82,
        accuracy01: 0.85,
        completeness01: 0.8,
        prosody01: 0.75,
        overall01: 0.86,
        clarity01: 0.85,
        provider: 'azure',
      },
    })
    expect(
      (withVoice.scores.pronunciation_delivery ?? 0) > (base.scores.pronunciation_delivery ?? 0) + 0.05,
    ).toBe(true)
  })

  it('scores stricter in simulation than training', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const task = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_speaking_part1',
      sessionSeed: 's1',
    })[0]
    const sim = scoreTaskAttempt({
      task,
      answerText: 'Ik wil graag een afspraak morgenochtend bij de huisartsenpost.',
      blueprint: profile.scoring,
      level: 'A2',
      mode: 'simulation',
      retriesUsed: 0,
    })
    const train = scoreTaskAttempt({
      task,
      answerText: 'Ik wil graag een afspraak morgenochtend bij de huisartsenpost.',
      blueprint: profile.scoring,
      level: 'A2',
      mode: 'training',
      retriesUsed: 0,
    })
    expect(train.composite).toBeGreaterThan(sim.composite)
  })

  it('simulation listening MCQ scores 100% when the keyed answer matches', () => {
    const profile = getExamProfile('inburgering_listening_A2')!
    const tasks = generateExamTasks({
      profile,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'luisterexamen',
      sessionSeed: 'listen-mcq-score',
    })
    const task = tasks.find((t) => t.taskType === 'listening_mcq_exam' && t.mcq)!
    const correctId = task.mcq!.correctOptionIds[0]!
    const scored = scoreTaskAttempt({
      task,
      answerText: correctId,
      blueprint: profile.scoring,
      level: 'A2',
      mode: 'simulation',
      retriesUsed: 0,
    })
    expect(scored.composite).toBe(1)
  })

  it('aggregates attempts', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const task = generateExamTasks({
      profile,
      level: 'A1',
      mode: 'training',
      scope: 'section',
      sectionId: 'a2_speaking_part1',
      sessionSeed: 's2',
    })[0]
    const a = scoreTaskAttempt({
      task,
      answerText: 'Mag ik water alstublieft?',
      blueprint: profile.scoring,
      level: 'A1',
      mode: 'training',
      retriesUsed: 0,
    })
    const attempts = [
      {
        taskId: task.id,
        taskType: task.taskType,
        sectionId: task.sectionId,
        answerText: 'x',
        submittedAt: new Date().toISOString(),
        retriesUsed: 0,
        scores: a.scores,
        composite: a.composite,
        mode: 'training' as const,
      },
    ]
    const agg = aggregateAttempts(attempts)
    expect(Object.keys(agg).length).toBeGreaterThan(0)
  })
})

describe('readiness + report', () => {
  it('computes readiness snapshot', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const snap = computeReadiness(profile, [])
    expect(['ready', 'borderline', 'not_ready']).toContain(snap.band)
    expect(snap.rationale?.length).toBeGreaterThan(0)
    expect(snap.simulationEvidenceCount).toBe(0)
  })

  it('builds simulation report', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const session = createExamSession({
      userId: 'u1',
      profileId: 'inburgering_speaking_v1',
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_speaking_part1',
    })!
    const t0 = session.tasks[0]
    const withAttempt = appendTaskAttempt(session, {
      taskId: t0.id,
      answerText: 'Een redelijk antwoord met genoeg woorden voor de heuristic.',
      retriesUsed: 0,
    })!
    const rep = buildSimulationReport(withAttempt, profile)
    expect(rep.kind).toBe('simulation')
    expect(rep.profileId).toBe('inburgering_speaking_v1')
    expect(rep.readinessBand).toBeTruthy()
    expect(rep.overallScore01).toBe(rep.readinessScore01)
    expect(rep.sectionScores.length).toBeGreaterThan(0)
    expect(rep.readinessConfidenceNotes.length).toBeGreaterThan(0)
    expect(rep.questionBreakdown?.length).toBe(withAttempt.tasks.length)
    expect(rep.questionBreakdown?.[0]?.score01).toBeGreaterThanOrEqual(0)
    expect(rep.questionBreakdown?.[0]?.userAnswerText.length).toBeGreaterThan(0)
    expect(rep.questionBreakdown?.[0]?.improvementTips.length).toBeGreaterThan(0)
    expect(rep.attemptedCount).toBe(1)
    expect(rep.totalTaskCount).toBe(withAttempt.tasks.length)
    expect(rep.answeredScore01).toBeGreaterThanOrEqual(0)
    expect(rep.answeredScore01).toBeLessThanOrEqual(1)
  })

  it('partial simulation: overallScore01 counts unanswered tasks as 0', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const session = createExamSession({
      userId: 'u1',
      profileId: 'inburgering_speaking_v1',
      level: 'A2',
      mode: 'simulation',
      scope: 'full',
    })!
    expect(session.tasks.length).toBeGreaterThan(1)
    const t0 = session.tasks[0]
    const withAttempt = appendTaskAttempt(session, {
      taskId: t0.id,
      answerText: 'Een redelijk antwoord met genoeg woorden voor de heuristic.',
      retriesUsed: 0,
    })!

    const rep = buildSimulationReport(withAttempt, profile)
    expect(rep.attemptedCount).toBe(1)
    expect(rep.totalTaskCount).toBe(withAttempt.tasks.length)
    /** Answered-task average should exceed exam-equivalent score by ~ tasks-attempted/total ratio. */
    expect(rep.answeredScore01!).toBeGreaterThan(rep.overallScore01)
    const expectedExam =
      (rep.answeredScore01! * rep.attemptedCount!) / rep.totalTaskCount!
    expect(rep.overallScore01).toBeCloseTo(expectedExam, 5)
    expect(rep.readinessScore01).toBe(rep.overallScore01)
    /** With ~1 of many answered, exam-equivalent is low → not_ready band. */
    expect(rep.readinessBand).toBe('not_ready')
  })

  it('resolveSimulationReportDisplayStats reconstructs exam-equivalent from legacy reports', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    const session = createExamSession({
      userId: 'u1',
      profileId: 'inburgering_speaking_v1',
      level: 'A2',
      mode: 'simulation',
      scope: 'full',
    })!
    const t0 = session.tasks[0]
    const withAttempt = appendTaskAttempt(session, {
      taskId: t0.id,
      answerText: 'Een redelijk antwoord met genoeg woorden voor de heuristic.',
      retriesUsed: 0,
    })!
    const rep = buildSimulationReport(withAttempt, profile)
    const legacyRep = {
      ...rep,
      /** Simulate a pre-fix stored report: overallScore01 = answered-tasks average. */
      overallScore01: rep.answeredScore01!,
      readinessScore01: rep.answeredScore01!,
      attemptedCount: undefined,
      totalTaskCount: undefined,
      answeredScore01: undefined,
    }
    const stats = resolveSimulationReportDisplayStats(withAttempt, legacyRep, profile)
    expect(stats.attemptedCount).toBe(1)
    expect(stats.totalTaskCount).toBe(withAttempt.tasks.length)
    expect(stats.answeredScore01).toBeCloseTo(rep.answeredScore01!, 5)
    expect(stats.examEquivalentScore01).toBeCloseTo(rep.overallScore01, 5)
    expect(stats.readinessBand).toBe(rep.readinessBand)
    expect(stats.isComplete).toBe(false)
  })

  it('A2 Part 1 bank has a contextual example on every item (no generic hobby scaffold)', () => {
    const pasta = A2_PART1_QUESTION_BANK.find((i) => i.nl.includes('pasta bereidt'))!
    expect(pasta.example).toBeDefined()
    expect(pasta.example).toMatch(/kook|pan|pasta/i)
    expect(pasta.example).not.toMatch(/omdat het rustig is/)
    for (const item of A2_PART1_QUESTION_BANK) {
      expect(item.example?.trim().length ?? 0).toBeGreaterThan(12)
    }
  })

  it('inferSpeakingModelAnswer matches pasta prompt at A2', () => {
    const ans = inferSpeakingModelAnswerNl({
      taskType: 'short_response',
      promptNl: 'Beschrijf kort hoe je thuis pasta bereidt of bestelt (twee zinnen).',
      level: 'A2',
    })
    expect(ans.isScaffold).toBe(false)
    expect(ans.text).toMatch(/water|pan|pasta/i)
    expect(ans.text).not.toMatch(/Ik doe graag \.\.\./)
  })

  it('A2 follow-up sample answer is shorter than B1 for the same customer prompt', () => {
    const prompt =
      'Een klant zegt: “Dit product is kapot gegaan na één dag.” Hoe reageer je (als medewerker)?'
    const a2 = synthesizeSpeakingReportExampleNl({
      taskType: 'follow_up_response',
      promptNl: prompt,
      level: 'A2',
    })
    const b1 = synthesizeSpeakingReportExampleNl({
      taskType: 'follow_up_response',
      promptNl: prompt,
      level: 'B1',
    })
    expect(a2.text.split(/\s+/).length).toBeLessThan(b1.text.split(/\s+/).length)
    expect(a2.text).toMatch(/bon/i)
    expect(a2.text).not.toMatch(/ongemak/i)
    expect(b1.text).toMatch(/ongemak/i)
  })

  it('blendHeuristicCompositeWithAnswerFit moves score toward answer-fit target', () => {
    const high = blendHeuristicCompositeWithAnswerFit(0.88, 'no', 1)
    expect(high).toBeLessThan(0.88)
    const lifted = blendHeuristicCompositeWithAnswerFit(0.25, 'yes', 1)
    expect(lifted).toBeGreaterThan(0.25)
  })

  it('applyLlmAnswerEvaluationsToAttempts lowers composite when fit is poor', () => {
    const profile = getExamProfile('inburgering_writing_A2')!
    const session = createExamSession({
      userId: 'u1',
      profileId: profile.examId,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_writing_examen',
    })!
    const t0 =
      session.tasks.find((t) => t.writingExamStratum !== 'form_fill') ??
      session.tasks.find((t) => !t.writingFillInBulletsNl?.length) ??
      session.tasks[0]!
    const withAttempt = appendTaskAttempt(session, {
      taskId: t0.id,
      answerText:
        'Geachte mevrouw,\n\nIk wil graag een afspraak maken. Ik ben vandaag thuis geweest en ik werk morgen.\n\nMet vriendelijke groet,\nJan',
      retriesUsed: 0,
    })!
    const fin = finalizeExamSession(withAttempt)!
    const baseComposite = fin.attempts[0]!.composite
    const ev = deterministicExamAnswerEvaluation(t0, fin.attempts[0]!, 'A2')
    const out = applyLlmAnswerEvaluationsToAttempts(fin, {
      [t0.id]: { ...ev, fit: 'no', confidence01: 1 },
    })
    expect(out[0]!.composite).toBeLessThan(baseComposite)
  })

  it('reprocessCompletedExamReport rescores attempts and rebuilds stored simulation report', () => {
    const profile = getExamProfile('inburgering_writing_A2')!
    const session = createExamSession({
      userId: 'u1',
      profileId: profile.examId,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_writing_examen',
    })!
    const t0 = session.tasks[0]!
    const withAttempt = appendTaskAttempt(session, {
      taskId: t0.id,
      answerText: 'ja',
      retriesUsed: 0,
    })!
    const fin = finalizeExamSession(withAttempt)!
    expect(fin.status).toBe('completed')
    expect(fin.report?.kind).toBe('simulation')
    const again = reprocessCompletedExamReport(fin)
    expect(again).not.toBeNull()
    expect(again!.report?.kind).toBe('simulation')
    expect(again!.attempts.length).toBe(fin.attempts.length)
    expect(typeof again!.attempts[0]?.composite).toBe('number')
  })

  it('preview counts simulation blueprint tasks', () => {
    const profile = getExamProfile('inburgering_speaking_A1')!
    const prev = computeSimulationRunPreview({
      profile,
      level: 'A1',
      scope: 'section',
      sectionId: 'oral_basics',
    })
    expect(prev.taskCount).toBeGreaterThan(0)
    expect(prev.estimatedSeconds).toBeGreaterThan(0)
  })
})

describe('xp bands', () => {
  it('returns zero when below min tasks', () => {
    const b = computeExamXpBand({
      sessionId: 'x',
      meta: { scope: 'full', runMode: 'simulation' },
      tasksCompleted: 1,
      minTasksRequired: 5,
    })
    expect(b.base).toBe(0)
  })

  it('returns non-zero simulation xp when enough tasks', () => {
    const b = computeExamXpBand({
      sessionId: 'y',
      meta: { scope: 'section', runMode: 'simulation' },
      tasksCompleted: 5,
      minTasksRequired: 3,
    })
    expect(b.base).toBeGreaterThan(0)
  })

  it('adds small readiness bonus band when readiness lift flag set', () => {
    const b = computeExamXpBand({
      sessionId: 'z-fixed',
      meta: { scope: 'section', runMode: 'training', timedTraining: false, readinessLift: true },
      tasksCompleted: 4,
      minTasksRequired: 2,
    })
    expect(b.readinessBonus).toBeGreaterThanOrEqual(2)
    expect(b.readinessBonus).toBeLessThanOrEqual(5)
    expect(b.timedBonus).toBe(0)
  })
})

describe('exam XP engine integration', () => {
  it('awards zero XP when unique tasks below minimum even with long duration', () => {
    const r = calculateXP(
      {
        type: 'exam_simulation',
        completed: true,
        durationSeconds: 3600,
        meaningfulCompletion: false,
        turns: 1,
        xpBandSeed: 'edge-long',
        examXpMeta: { scope: 'section', runMode: 'simulation' },
        examTasksCompleted: 1,
        examMinTasks: 3,
      },
      { currentStreak: 0 },
    )
    expect(r.totalXP).toBe(0)
  })

  it('awards positive XP when min tasks met', () => {
    const r = calculateXP(
      {
        type: 'exam_training',
        completed: true,
        durationSeconds: 120,
        meaningfulCompletion: true,
        turns: 4,
        improvements: ['exam_improved:structure'],
        xpBandSeed: 'edge-ok',
        examXpMeta: { scope: 'section', runMode: 'training', timedTraining: true, weaknessRepair: true },
        examTasksCompleted: 4,
        examMinTasks: 2,
      },
      { currentStreak: 3 },
      { sessionXpCap: 90 },
    )
    expect(r.totalXP).toBeGreaterThan(15)
  })
})

describe('exam personalization bridge', () => {
  it('emits memory tags for simulation under-pressure and weak task types', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    let s = createExamSession({
      userId: 'u1',
      profileId: profile.examId,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_speaking_part1',
    })!
    for (const t of s.tasks.slice(0, 2)) {
      const next = appendTaskAttempt(s, {
        taskId: t.id,
        answerText: 'Kort antwoord.',
        retriesUsed: 0,
      })!
      s = next
    }
    const fin = finalizeExamSession(s)!
    const tags = buildExamMemoryWeaknessTags(fin)
    expect(tags.some((x) => x.includes('exam_under_pressure'))).toBe(true)
    expect(tags.some((x) => x.startsWith('exam_task_weak:'))).toBe(true)
  })
})

describe('session lifecycle + progression bridge', () => {
  it('finalizes and maps progression body', () => {
    const profile = getExamProfile('inburgering_speaking_v1')!
    let s: NonNullable<ReturnType<typeof createExamSession>> = createExamSession({
      userId: 'u1',
      profileId: profile.examId,
      level: 'A2',
      mode: 'simulation',
      scope: 'section',
      sectionId: 'a2_speaking_part1',
    })!
    for (const t of s.tasks) {
      const next = appendTaskAttempt(s, {
        taskId: t.id,
        answerText: 'Antwoord met voldoende woorden voor een score.',
        retriesUsed: 0,
      })!
      s = next
    }
    const fin = finalizeExamSession(s)!
    expect(fin.status).toBe('completed')
    const minT = minTasksForXp(fin, fin.profileId)
    expect(minT).toBeGreaterThan(0)
    const body = toProgressionSessionComplete(fin, fin.profileId)
    expect(body?.type).toBe('exam_simulation')
    expect(body?.meaningfulCompletion).toBe(fin.attempts.length >= minT)
  })
})

describe('exam timer model + policy', () => {
  it('formats clock as m:ss', () => {
    expect(formatExamClock(65)).toBe('1:05')
    expect(formatExamClock(0)).toBe('0:00')
  })

  it('picks tighter section cap when both rule and blueprint set', () => {
    expect(resolveSectionWallBudgetSeconds(600, 300)).toBe(300)
    expect(resolveSectionWallBudgetSeconds(0, 400)).toBe(400)
    expect(resolveSectionWallBudgetSeconds(120, 0)).toBe(120)
  })

  it('computes session wall remaining across phases', () => {
    const tasks = [
      { prepSeconds: 10, answerSeconds: 20 },
      { prepSeconds: 5, answerSeconds: 15 },
    ]
    expect(
      computeSessionWallClockRemaining({
        tasks,
        taskIndex: 0,
        isSim: true,
        simPhase: 'intro',
        trainPhase: 'prep',
        remainingCurrentPhaseSec: 3,
      }),
    ).toBe(3 + 10 + 20 + 5 + 15)
    expect(
      computeSessionWallClockRemaining({
        tasks,
        taskIndex: 0,
        isSim: true,
        simPhase: 'prep',
        trainPhase: 'prep',
        remainingCurrentPhaseSec: 4,
      }),
    ).toBe(4 + 20 + 5 + 15)
  })

  it('derives section pace remaining within a section', () => {
    const tasks = [
      { sectionId: 'a', prepSeconds: 10, answerSeconds: 20 },
      { sectionId: 'a', prepSeconds: 1, answerSeconds: 2 },
      { sectionId: 'b', prepSeconds: 9, answerSeconds: 9 },
    ]
    expect(sectionPaceRemainingSeconds(tasks, 0, 'prep', 5)).toBe(5 + 20 + 1 + 2)
    expect(sectionPaceRemainingSeconds(tasks, 0, 'answer', 12)).toBe(12 + 1 + 2)
  })

  it('exposes total estimate from profile blueprint', () => {
    const p = getExamProfile('inburgering_speaking_v1')!
    const est = resolveTotalEstimateDisplaySeconds(p)
    expect(est).toBeTruthy()
    expect(est).toBe(p.simulationBlueprint.totalEstimateSeconds)
  })

  it('training prep is soft when optional and not timed', () => {
    const prepRule = { kind: 'prep' as const, seconds: 60, optionalInTraining: true, autoAdvance: false }
    expect(
      trainingPrepIsTimed({
        support: 'full_guidance',
        timedTraining: false,
        prepRule,
      }),
    ).toBe(false)
    expect(
      trainingPrepIsTimed({
        support: 'almost_exam',
        timedTraining: false,
        prepRule,
      }),
    ).toBe(true)
  })

  it('resolves answer auto-submit for simulation and strict training', () => {
    const simAns = { kind: 'answer' as const, seconds: 120, autoAdvance: true }
    const trainAns = { kind: 'answer' as const, seconds: 150, autoAdvance: false }
    expect(
      resolveAnswerAutoSubmitOnTimeout({
        runMode: 'simulation',
        timedTraining: false,
        support: 'light_guidance',
        simAnswerRule: simAns,
        trainAnswerRule: trainAns,
      }),
    ).toBe(true)
    expect(
      resolveAnswerAutoSubmitOnTimeout({
        runMode: 'training',
        timedTraining: false,
        support: 'almost_exam',
        simAnswerRule: simAns,
        trainAnswerRule: trainAns,
      }),
    ).toBe(true)
    expect(
      resolveAnswerAutoSubmitOnTimeout({
        runMode: 'training',
        timedTraining: false,
        support: 'full_guidance',
        simAnswerRule: simAns,
        trainAnswerRule: trainAns,
      }),
    ).toBe(false)
  })

  it('section wall strict in simulation', () => {
    const sectionRule = { kind: 'section' as const, seconds: 0, optionalInTraining: true }
    expect(
      sectionWallIsStrict({
        runMode: 'simulation',
        timedTraining: false,
        support: 'full_guidance',
        sectionRule,
      }),
    ).toBe(true)
    expect(
      sectionWallIsStrict({
        runMode: 'training',
        timedTraining: false,
        support: 'full_guidance',
        sectionRule,
      }),
    ).toBe(false)
  })
})

describe('timer engine', () => {
  it('counts down remaining', () => {
    const now = new Date('2020-01-01T00:00:10Z')
    const t = createTimer(now.getTime() + 5000, 'answer')
    expect(remainingMs(now, t)).toBeGreaterThan(0)
    expect(isExpired(new Date('2020-01-01T00:00:20Z'), t)).toBe(true)
  })
})
