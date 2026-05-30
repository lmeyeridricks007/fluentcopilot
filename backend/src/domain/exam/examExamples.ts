import type {
  CreateExamSessionInput,
  CreateExamTaskRunInput,
  ExamProfile,
  ExamReadinessSnapshot,
  ExamReport,
  ExamSession,
  ExamTaskRun,
} from './examTypes'

/** Matches seeded `ExamProfiles.Id` for A2 in migration `044_exam_persistence.sql`. */
export const EXAMPLE_PROFILE_ID_A2 = '00000000-0000-4000-8000-0000000000A2'

export const exampleExamProfileA2: ExamProfile = {
  id: EXAMPLE_PROFILE_ID_A2,
  examCode: 'inburgering_speaking',
  level: 'A2',
  title: 'Inburgering — Speaking (A2)',
  description: 'Integration exam speaking track — A2 band.',
  simulationBlueprint: {
    schemaVersion: 1,
    sections: [
      {
        id: 'oral_basics',
        title: 'Oral basics',
        tasks: [
          {
            id: 'tb-practical-1',
            taskType: 'practical_request',
            count: 1,
            prepSeconds: 30,
            answerSeconds: 90,
            scoringWeights: { task_completion: 1, politeness: 0.8 },
            generationConfig: { promptKey: 'practical_request' },
            supportRules: { hintsAllowed: false, maxRetriesPerTask: 0, coachingDuringAnswer: false },
          },
        ],
      },
    ],
  },
  trainingBlueprint: {
    schemaVersion: 1,
    defaultSupportMode: 'light_guidance',
    repeatedPracticeAllowed: true,
    adaptiveWeaknessTargetingAllowed: true,
    sections: [
      {
        id: 'oral_basics',
        title: 'Oral basics',
        tasks: [
          {
            id: 'tb-practical-1',
            taskType: 'practical_request',
            count: 1,
            prepSeconds: 45,
            answerSeconds: 120,
            scoringWeights: { task_completion: 1 },
            generationConfig: { promptKey: 'practical_request' },
            supportRules: { hintsAllowed: true, examplesAllowed: true, maxRetriesPerTask: 2 },
          },
        ],
      },
    ],
  },
  scoringBlueprint: {
    schemaVersion: 1,
    coreWeights: { task_completion: 1, grammar_control: 0.9 },
    strictnessSimulation: 1.05,
    leniencyTraining: 1.08,
    overlaysByTask: {
      practical_request: { weights: { politeness: 0.5 } },
    },
  },
  uiConfig: {
    schemaVersion: 1,
    minTasksForMeaningfulXp: { simulation: { full: 5, section: 3 }, training: 3 },
  },
  passThresholds: { readyAbove: 0.72, borderlineAbove: 0.58 },
  readinessConfig: { windowDays: 30 },
  schemaVersion: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

export const exampleCreateExamSessionInput: CreateExamSessionInput = {
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  profileId: EXAMPLE_PROFILE_ID_A2,
  level: 'A2',
  mode: 'simulation',
  supportMode: 'none',
  sectionId: 'oral_basics',
  scope: 'section',
  status: 'in_progress',
  meta: { source: 'example', xpMeta: { scope: 'section', runMode: 'simulation' } },
}

export const exampleExamSession: ExamSession = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  userId: exampleCreateExamSessionInput.userId,
  profileId: EXAMPLE_PROFILE_ID_A2,
  level: 'A2',
  mode: 'simulation',
  supportMode: 'none',
  sectionId: 'oral_basics',
  scope: 'section',
  status: 'in_progress',
  startedAt: '2026-04-22T12:00:00.000Z',
  completedAt: null,
  totalXP: null,
  readinessEstimate: null,
  confidence: null,
  meta: { source: 'example' },
  createdAt: '2026-04-22T12:00:00.000Z',
  updatedAt: '2026-04-22T12:00:00.000Z',
}

export const exampleCreateExamTaskRunInput: CreateExamTaskRunInput = {
  sessionId: exampleExamSession.id,
  taskBlueprintId: 'tb-practical-1',
  taskType: 'practical_request',
  sortOrder: 0,
  prompt: 'Vraag beleefd om een glas water in een restaurant.',
  promptMeta: { locale: 'nl-NL', level: 'A2' },
}

export const exampleExamTaskRun: ExamTaskRun = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  sessionId: exampleExamSession.id,
  taskBlueprintId: 'tb-practical-1',
  taskType: 'practical_request',
  sortOrder: 0,
  prompt: exampleCreateExamTaskRunInput.prompt,
  promptMeta: { locale: 'nl-NL' },
  prepStartedAt: '2026-04-22T12:00:05.000Z',
  answerStartedAt: '2026-04-22T12:00:40.000Z',
  answerEndedAt: null,
  audioUrl: null,
  textAnswer: 'Mag ik alstublieft een glas water?',
  scoreBreakdown: { task_completion: 0.82, politeness: 0.79 },
  feedbackSummary: 'Clear and polite; extend with one detail.',
  createdAt: '2026-04-22T12:00:00.000Z',
  updatedAt: '2026-04-22T12:01:30.000Z',
}

export const exampleExamReport: ExamReport = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  sessionId: exampleExamSession.id,
  mode: 'simulation',
  level: 'A2',
  overallOutcome: 'borderline_pass',
  readinessState: 'borderline',
  confidence: 'medium',
  sectionBreakdown: [{ sectionId: 'oral_basics', score: 0.68 }],
  taskTypeBreakdown: [{ taskType: 'practical_request', average: 0.8, count: 1 }],
  blockers: ['follow_up_response'],
  recommendations: ['Train follow-up continuity under timer.'],
  xpAwarded: 22,
  createdAt: '2026-04-22T12:05:00.000Z',
}

export const exampleExamReadinessSnapshot: ExamReadinessSnapshot = {
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  userId: exampleExamSession.userId,
  profileId: EXAMPLE_PROFILE_ID_A2,
  level: 'A2',
  readinessState: 'borderline',
  confidence: 'medium',
  blockers: ['timed_discourse'],
  strengths: ['practical_request'],
  generatedAt: '2026-04-22T12:10:00.000Z',
}
