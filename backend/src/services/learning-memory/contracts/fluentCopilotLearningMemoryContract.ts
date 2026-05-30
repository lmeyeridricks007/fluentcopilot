import type sql from 'mssql'
import type {
  BuildLanguageCoachPersonalizationOptionsDTO,
  BuildReadAloudPersonalizationOptionsDTO,
  CoachPersonalizationDTO,
  FluentCopilotUserId,
  MergeSessionInsightsInputDTO,
  PracticeRecommendationsContextDTO,
  PracticeRecommendationsDTO,
  ReadAloudPersonalizationDTO,
  SaveSessionLearningInsightsInputDTO,
  ScenarioPersonalizationDTO,
  UserFocusAreasDTO,
  UserLearningProfileDTO,
} from './learningMemory.dto'

/**
 * FluentCopilot learning memory — internal service surface.
 *
 * **Identity:** `userId` is always `dbo.Users.Id` (UUID). HTTP layers resolve external IDs first.
 *
 * **Wiring:** Create via {@link createFluentCopilotLearningMemoryService} per request/job with a SQL pool.
 * No separate REST layer is required; Azure Functions and `conversationAppService` call this facade.
 */
export interface IFluentCopilotLearningMemoryService {
  /** Load and parse persisted profile (empty-ish document if row missing). */
  getUserLearningProfile(userId: FluentCopilotUserId): Promise<UserLearningProfileDTO>

  /** Append a session insight row (audit / replay); does not merge into profile. */
  saveSessionLearningInsights(input: SaveSessionLearningInsightsInputDTO): Promise<{ insightRowId: string }>

  /** Merge session extract into profile and persist. */
  mergeSessionInsights(input: MergeSessionInsightsInputDTO): Promise<UserLearningProfileDTO>

  /**
   * Recompute ranked recommendations + chips from the current profile.
   * `context` is reserved for future modality weighting.
   */
  getPracticeRecommendations(
    userId: FluentCopilotUserId,
    context?: PracticeRecommendationsContextDTO | null,
  ): Promise<PracticeRecommendationsDTO>

  /** English prompt blocks for Language Coach / adaptive free talk. */
  buildLanguageCoachPersonalization(
    userId: FluentCopilotUserId,
    options?: BuildLanguageCoachPersonalizationOptionsDTO | null,
  ): Promise<CoachPersonalizationDTO>

  /** English + structured payload for a structured Speak Live scenario (requires DB scenario id). */
  buildScenarioPersonalization(userId: FluentCopilotUserId, scenarioId: string): Promise<ScenarioPersonalizationDTO>

  /** Passage authoring hints + chips for read-aloud generation. */
  buildReadAloudPersonalization(
    userId: FluentCopilotUserId,
    options: BuildReadAloudPersonalizationOptionsDTO,
  ): Promise<ReadAloudPersonalizationDTO>

  /** Compact focus snapshot for hub / ribbons (no raw weakness rows). */
  getUserFocusAreas(userId: FluentCopilotUserId): Promise<UserFocusAreasDTO>
}

export type FluentCopilotLearningMemoryServiceFactory = (
  pool: sql.ConnectionPool,
) => IFluentCopilotLearningMemoryService
