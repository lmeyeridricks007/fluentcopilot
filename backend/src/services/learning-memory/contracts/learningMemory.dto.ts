/**
 * FluentCopilot learning memory — stable DTOs for internal services and HTTP mappers.
 * Domain aggregates remain canonical in `domain/learningMemory/*`; DTOs are API-facing aliases + bundles.
 */
import type { ScenarioLivePersonalizationPayload } from '../../../domain/learningMemory/scenarioLivePersonalizationPayload'
import type {
  ReadAloudPassageGenreId,
  ReadAloudPassagePersonalizationResult,
} from '../../../domain/learningMemory/readAloudPersonalizationFromProfile'
import type { FluentLearningRecommendation } from '../../../domain/learningMemory/fluentLearningRecommendationEngine'
import type {
  PracticeRecommendations,
} from '../../../domain/learningMemory/learningMemoryRecommendationService'
import type { SessionLearningInsights } from '../../../domain/learningMemory/sessionLearningInsightTypes'
import type { UserLearningProfile } from '../../../domain/learningMemory/userLearningProfileDocument'
import type { SessionLearningSessionType } from '../../../repositories/userLearningMemoryRepository'

/** Internal user key: `dbo.Users.Id` (UUID string). Resolve external identity via `userRepository.ensureUser`. */
export type FluentCopilotUserId = string

/** Persisted learner aggregate (`ProfileJson` shape). */
export type UserLearningProfileDTO = UserLearningProfile

/** Session extract before / after merge (`SessionLearningInsights` v2). */
export type SessionLearningInsightsDTO = SessionLearningInsights

/** One ranked practice row (scenario, read-aloud, theme, chip, report step, …). */
export type PracticeRecommendationDTO = FluentLearningRecommendation

export type {
  SkillDrivenRecommendationItemDTO,
  SkillDrivenRecommendationPlanDTO,
} from '../../../domain/skills/skillRecommendationTypes'

/** Derived recommendation bundle (recomputed from profile; not raw DB rows only). */
export type PracticeRecommendationsDTO = PracticeRecommendations

export type SaveSessionLearningInsightsInputDTO = {
  userId: FluentCopilotUserId
  sessionType: SessionLearningSessionType
  threadId: string | null
  scenarioId: string | null
  insights: SessionLearningInsightsDTO
  signals?: Record<string, unknown> | null
}

export type MergeSessionInsightsInputDTO = {
  userId: FluentCopilotUserId
  sessionInsights: SessionLearningInsightsDTO
  sessionType: SessionLearningSessionType
  scenarioId: string | null
}

/** Optional hints for future modality-weighted ranking (v1: ignored beyond documentation). */
export type PracticeRecommendationsContextDTO = {
  modalityHint?: SessionLearningSessionType
}

/** Language Coach / free-talk style prompt blocks (English, internal). */
export type CoachPersonalizationDTO = {
  coachPersistentEnglish: string
  scenarioAdaptationEnglish: string
  scenarioMicroHintEnglish: string
}

/** Structured Speak Live scene adaptation (English + optional structured tail). */
export type ScenarioPersonalizationDTO = {
  scenarioAdaptationEnglish: string
  scenarioMicroHintEnglish: string
  scenarioLivePersonalization: ScenarioLivePersonalizationPayload | null
}

/** Read-aloud passage generation / hints for authoring models + UI chips. */
export type ReadAloudPersonalizationDTO = ReadAloudPassagePersonalizationResult

export type BuildReadAloudPersonalizationOptionsDTO = {
  level: 'A1' | 'A2' | 'B1' | 'B2'
  genre: ReadAloudPassageGenreId
  topic?: string | null
  personalizationProfileOverride?: string | null
}

export type BuildLanguageCoachPersonalizationOptionsDTO = {
  /** Defaults to `language_coach` when omitted. */
  scenarioSlug?: string
}

export type UserFocusAreasDTO = {
  activeFocusAreas: string[]
  topWeaknessLabels: string[]
  strongestAreas: string[]
  coldStart: boolean
  totalSessionsObserved: number
}
