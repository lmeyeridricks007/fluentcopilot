import type {
  ExamLevel,
  ExamPromptComplexity,
  ExamTaskBlueprint,
  ExamTaskGenerationRules,
  ExamTaskType,
} from '../types'

const simulationStrict = {
  hintsAllowed: false,
  coachingDuringAnswer: false,
  maxRetriesPerTask: 0,
} as const

const trainingLenient = {
  hintsAllowed: true,
  examplesAllowed: true,
  patternGuidance: true,
  postAnswerCoaching: true,
  maxRetriesPerTask: 2,
  repeatedPracticeAllowed: true,
  adaptiveWeaknessTargeting: true,
} as const

const trainingAlmostExam = {
  hintsAllowed: false,
  examplesAllowed: false,
  patternGuidance: true,
  postAnswerCoaching: true,
  maxRetriesPerTask: 1,
  repeatedPracticeAllowed: true,
  adaptiveWeaknessTargeting: true,
} as const

type TbInput = Omit<
  ExamTaskBlueprint,
  'training' | 'simulation' | 'taskWeighting' | 'promptComplexity' | 'generationRules'
> & {
  training?: Partial<ExamTaskBlueprint['training']>
  simulation?: Partial<ExamTaskBlueprint['simulation']>
  taskWeighting?: number
  promptComplexity?: ExamPromptComplexity
  generationRules?: ExamTaskBlueprint['generationRules']
}

/** Simulation task row — no hints by default. */
export function simTask(p: TbInput): ExamTaskBlueprint {
  return {
    ...p,
    taskWeighting: p.taskWeighting ?? 1,
    promptComplexity: p.promptComplexity,
    generationRules: p.generationRules,
    training: { ...trainingLenient, ...p.training },
    simulation: { ...simulationStrict, ...p.simulation },
  }
}

/** Training task row — scaffolding allowed; can override toward almost-exam. */
export function trainTask(p: TbInput & { almostExam?: boolean }): ExamTaskBlueprint {
  const baseTrain = p.almostExam ? trainingAlmostExam : trainingLenient
  return {
    ...p,
    taskWeighting: p.taskWeighting ?? 1,
    promptComplexity: p.promptComplexity,
    generationRules: p.generationRules,
    training: { ...baseTrain, ...p.training },
    simulation: { ...simulationStrict, ...p.simulation },
  }
}

export function levelComplexity(level: ExamLevel): ExamPromptComplexity {
  if (level === 'A1') return 'low'
  if (level === 'B1') return 'high'
  return 'medium'
}

export function generationFor(
  level: ExamLevel,
  taskType: ExamTaskType,
  followUpDepth: 0 | 1 | 2,
): ExamTaskGenerationRules {
  const implied: ExamTaskGenerationRules['impliedContext'] =
    level === 'A1' ? 'low' : level === 'B1' ? 'high' : 'medium'
  const min = level === 'A1' ? 4 : level === 'B1' ? 10 : 6
  const max = level === 'A1' ? 40 : level === 'B1' ? 120 : 80
  return {
    templateFamily: taskType,
    followUpDepth,
    impliedContext: implied,
    minWordsHint: min,
    maxWordsHint: max,
  }
}
