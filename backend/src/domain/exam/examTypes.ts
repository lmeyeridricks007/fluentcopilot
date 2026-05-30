/**
 * Fluent Exam — domain types (backend-first, JSON-serializable blueprints for SQL storage).
 */

export type ExamLevel = 'A1' | 'A2' | 'B1'

export type ExamMode = 'simulation' | 'training'

/** Support / scaffolding level during a session (simulation typically uses `none`). */
export type ExamSupportMode = 'none' | 'full_guidance' | 'light_guidance' | 'almost_exam'

export type ExamTaskType =
  | 'practical_request'
  | 'short_response'
  | 'roleplay'
  | 'describe_situation'
  | 'explain_process'
  | 'give_opinion'
  | 'justify_reason'
  | 'follow_up_response'
  | 'compare_options'
  | 'storytelling'
  | 'sequencing'
  | 'read_aloud_exam'
  | 'listening_response_exam'
  | 'writing_task_exam'

export type ExamSessionStatus = 'draft' | 'in_progress' | 'completed' | 'abandoned'

export type ExamSessionScope = 'full' | 'section'

/** Per-task weights keyed by scoring dimension id (extensible string union + open string). */
export type ExamScoringWeights = Record<string, number>

/** Prompt / LLM / template hints — opaque but typed as JSON object. */
export type ExamGenerationConfig = Record<string, unknown>

export type ExamTaskSupportRules = {
  hintsAllowed?: boolean
  examplesAllowed?: boolean
  patternGuidance?: boolean
  postAnswerCoaching?: boolean
  maxRetriesPerTask?: number
  coachingDuringAnswer?: boolean
}

export type ExamTaskBlueprint = {
  id: string
  taskType: ExamTaskType
  count: number
  prepSeconds: number
  answerSeconds: number
  scoringWeights: ExamScoringWeights
  generationConfig: ExamGenerationConfig
  supportRules: ExamTaskSupportRules
}

export type ExamSectionBlueprint = {
  id: string
  title: string
  description?: string
  tasks: ExamTaskBlueprint[]
  sectionSeconds?: number
}

export type ExamSimulationBlueprint = {
  schemaVersion: number
  sections: ExamSectionBlueprint[]
  /** Optional global timer hints for UI (seconds). */
  totalEstimateSeconds?: number
}

export type ExamTrainingBlueprint = {
  schemaVersion: number
  sections: ExamSectionBlueprint[]
  /** Default support when not overridden on session. */
  defaultSupportMode?: ExamSupportMode
  /** Policy: allow looping similar prompts in Train pillar. */
  repeatedPracticeAllowed?: boolean
  /** Policy: allow biasing weak task types from evidence. */
  adaptiveWeaknessTargetingAllowed?: boolean
}

export type ExamScoringBlueprint = {
  schemaVersion: number
  coreWeights: ExamScoringWeights
  strictnessSimulation: number
  leniencyTraining: number
  overlaysByTask: Partial<Record<ExamTaskType, { weights: ExamScoringWeights }>>
}

export type ExamUiConfig = {
  schemaVersion: number
  minTasksForMeaningfulXp?: {
    simulation: { full: number; section: number }
    training: number
  }
  /** Arbitrary UI hints (timer style, copy ids, etc.). */
  chrome?: Record<string, unknown>
}

export type ExamPassThresholds = {
  readyAbove: number
  borderlineAbove: number
}

export type ExamReadinessConfig = {
  /** Rolling window for evidence aggregation (days). */
  windowDays?: number
  /** Optional weights for external signals (skills, memory) — future. */
  signalWeights?: Record<string, number>
}

export type ExamProfile = {
  id: string
  examCode: string
  level: ExamLevel
  title: string
  description: string | null
  simulationBlueprint: ExamSimulationBlueprint
  trainingBlueprint: ExamTrainingBlueprint
  scoringBlueprint: ExamScoringBlueprint
  uiConfig: ExamUiConfig
  passThresholds: ExamPassThresholds
  readinessConfig: ExamReadinessConfig
  schemaVersion: number
  createdAt: string
  updatedAt: string
}

export type ExamSessionMeta = {
  /** Client / bridge fields: XP meta, practice flags, etc. */
  [key: string]: unknown
}

export type ExamSession = {
  id: string
  userId: string
  profileId: string
  level: ExamLevel
  mode: ExamMode
  supportMode: ExamSupportMode | null
  sectionId: string | null
  scope: ExamSessionScope
  status: ExamSessionStatus
  startedAt: string
  completedAt: string | null
  totalXP: number | null
  readinessEstimate: number | null
  confidence: string | null
  meta: ExamSessionMeta
  createdAt: string
  updatedAt: string
}

export type ExamTaskRunPromptMeta = Record<string, unknown>

export type ExamScoreBreakdown = Record<string, number>

export type ExamTaskRun = {
  id: string
  sessionId: string
  taskBlueprintId: string
  taskType: ExamTaskType
  sortOrder: number
  prompt: string
  promptMeta: ExamTaskRunPromptMeta
  prepStartedAt: string | null
  answerStartedAt: string | null
  answerEndedAt: string | null
  audioUrl: string | null
  textAnswer: string | null
  scoreBreakdown: ExamScoreBreakdown | null
  feedbackSummary: string | null
  createdAt: string
  updatedAt: string
}

export type ExamReportSectionBreakdown = Array<{
  sectionId: string
  title?: string
  score?: number
  notes?: string
}>

export type ExamReportTaskTypeBreakdown = Array<{
  taskType: ExamTaskType
  average?: number
  count?: number
}>

export type ExamReport = {
  id: string
  sessionId: string
  mode: ExamMode
  level: ExamLevel
  overallOutcome: string
  readinessState: string
  confidence: string
  sectionBreakdown: ExamReportSectionBreakdown
  taskTypeBreakdown: ExamReportTaskTypeBreakdown
  blockers: string[]
  recommendations: string[]
  xpAwarded: number
  createdAt: string
}

export type ExamReadinessSnapshot = {
  id: string
  userId: string
  profileId: string
  level: ExamLevel
  readinessState: string
  confidence: string
  blockers: string[]
  strengths: string[]
  generatedAt: string
}

/** Partial update for {@link ExamSession}. */
export type ExamSessionPatch = Partial<{
  status: ExamSessionStatus
  completedAt: string | null
  totalXP: number | null
  readinessEstimate: number | null
  confidence: string | null
  meta: ExamSessionMeta
  supportMode: ExamSupportMode | null
  sectionId: string | null
  scope: ExamSessionScope
}>

export type ExamTaskRunPatch = Partial<{
  prepStartedAt: string | null
  answerStartedAt: string | null
  answerEndedAt: string | null
  audioUrl: string | null
  textAnswer: string | null
  scoreBreakdown: ExamScoreBreakdown | null
  feedbackSummary: string | null
  prompt: string
  promptMeta: ExamTaskRunPromptMeta
}>

export type CreateExamSessionInput = {
  userId: string
  profileId: string
  level: ExamLevel
  mode: ExamMode
  supportMode?: ExamSupportMode | null
  sectionId?: string | null
  scope?: ExamSessionScope
  status?: ExamSessionStatus
  meta?: ExamSessionMeta
  startedAt?: string
}

export type CreateExamTaskRunInput = {
  sessionId: string
  taskBlueprintId: string
  taskType: ExamTaskType
  sortOrder: number
  prompt: string
  promptMeta?: ExamTaskRunPromptMeta
}

export type ExamHistoryFilter = {
  userId: string
  profileId?: string | null
  mode?: ExamMode | null
  level?: ExamLevel | null
  status?: ExamSessionStatus | null
  maxRows?: number
}

export type ExamHistoryRow = ExamSession & {
  reportXpAwarded: number | null
  hasReport: boolean
}
