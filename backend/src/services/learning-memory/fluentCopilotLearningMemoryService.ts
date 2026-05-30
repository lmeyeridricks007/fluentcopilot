import type sql from 'mssql'
import { buildLearningPersonalizationForTurn } from '../../domain/learningMemory/learningPersonalizationBuilders'
import { buildPracticeRecommendations, topWeaknessLabels } from '../../domain/learningMemory/learningMemoryRecommendationService'
import { resolveReadAloudPassagePersonalization } from '../../domain/learningMemory/readAloudPersonalizationFromProfile'
import * as scenarioRepo from '../../repositories/scenarioRepository'
import type { IFluentCopilotLearningMemoryService } from './contracts/fluentCopilotLearningMemoryContract'
import type {
  BuildLanguageCoachPersonalizationOptionsDTO,
  BuildReadAloudPersonalizationOptionsDTO,
  CoachPersonalizationDTO,
  MergeSessionInsightsInputDTO,
  PracticeRecommendationsContextDTO,
  PracticeRecommendationsDTO,
  ReadAloudPersonalizationDTO,
  SaveSessionLearningInsightsInputDTO,
  ScenarioPersonalizationDTO,
  UserFocusAreasDTO,
  UserLearningProfileDTO,
} from './contracts/learningMemory.dto'
import * as userLearningProfileService from './userLearningProfileService'

const COLD_START_SESSIONS = 2

/**
 * FluentCopilot learning memory facade — single entry for profile IO, merge, recommendations, personalization.
 *
 * @example
 * ```ts
 * const lm = createFluentCopilotLearningMemoryService(pool)
 * const profile = await lm.getUserLearningProfile(userInternalId)
 * const recs = await lm.getPracticeRecommendations(userInternalId)
 * ```
 */
export function createFluentCopilotLearningMemoryService(pool: sql.ConnectionPool): IFluentCopilotLearningMemoryService {
  return {
    async getUserLearningProfile(userId): Promise<UserLearningProfileDTO> {
      return userLearningProfileService.getUserLearningProfile(pool, userId)
    },

    async saveSessionLearningInsights(input: SaveSessionLearningInsightsInputDTO): Promise<{ insightRowId: string }> {
      const insightRowId = await userLearningProfileService.saveSessionLearningInsights({
        pool,
        userId: input.userId,
        sessionType: input.sessionType,
        threadId: input.threadId,
        scenarioId: input.scenarioId,
        insights: input.insights,
        signals: input.signals ?? null,
      })
      return { insightRowId }
    },

    async mergeSessionInsights(input: MergeSessionInsightsInputDTO): Promise<UserLearningProfileDTO> {
      return userLearningProfileService.mergeSessionInsightsIntoProfilePersisted({
        pool,
        userId: input.userId,
        insights: input.sessionInsights,
        sessionType: input.sessionType,
        scenarioId: input.scenarioId,
      })
    },

    async getPracticeRecommendations(
      userId: string,
      _context?: PracticeRecommendationsContextDTO | null,
    ): Promise<PracticeRecommendationsDTO> {
      void _context
      const doc = await userLearningProfileService.getUserLearningProfile(pool, userId)
      return buildPracticeRecommendations(doc)
    },

    async buildLanguageCoachPersonalization(
      userId: string,
      options?: BuildLanguageCoachPersonalizationOptionsDTO | null,
    ): Promise<CoachPersonalizationDTO> {
      const profile = await userLearningProfileService.getUserLearningProfile(pool, userId)
      const scenarioSlug = options?.scenarioSlug?.trim() || 'language_coach'
      const p = buildLearningPersonalizationForTurn({
        profile,
        scenarioSlug,
        scenarioId: null,
        isLanguageCoach: true,
      })
      return {
        coachPersistentEnglish: p.coachPersistentEnglish,
        scenarioAdaptationEnglish: p.scenarioAdaptationEnglish,
        scenarioMicroHintEnglish: p.scenarioMicroHintEnglish,
      }
    },

    async buildScenarioPersonalization(userId: string, scenarioId: string): Promise<ScenarioPersonalizationDTO> {
      const profile = await userLearningProfileService.getUserLearningProfile(pool, userId)
      const scenario = await scenarioRepo.getScenarioById(pool, scenarioId)
      const p = buildLearningPersonalizationForTurn({
        profile,
        scenarioSlug: scenario.slug,
        scenarioId: scenario.id,
        isLanguageCoach: false,
      })
      return {
        scenarioAdaptationEnglish: p.scenarioAdaptationEnglish,
        scenarioMicroHintEnglish: p.scenarioMicroHintEnglish,
        scenarioLivePersonalization: p.scenarioLivePersonalization,
      }
    },

    async buildReadAloudPersonalization(
      userId: string,
      options: BuildReadAloudPersonalizationOptionsDTO,
    ): Promise<ReadAloudPersonalizationDTO> {
      const doc = await userLearningProfileService.getUserLearningProfile(pool, userId)
      void buildPracticeRecommendations(doc)
      return resolveReadAloudPassagePersonalization({
        doc,
        level: options.level,
        genre: options.genre,
        topic: options.topic ?? null,
        personalizationProfileOverride: options.personalizationProfileOverride ?? null,
      })
    },

    async getUserFocusAreas(userId: string): Promise<UserFocusAreasDTO> {
      const doc = await userLearningProfileService.getUserLearningProfile(pool, userId)
      void buildPracticeRecommendations(doc)
      return {
        activeFocusAreas: [...doc.activeFocusAreas],
        topWeaknessLabels: topWeaknessLabels(doc, 8),
        strongestAreas: doc.strongestAreas.slice(0, 6),
        coldStart: doc.totalSessionsObserved < COLD_START_SESSIONS,
        totalSessionsObserved: doc.totalSessionsObserved,
      }
    },
  }
}
