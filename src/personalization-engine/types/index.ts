/**
 * Personalization Engine — type exports.
 */

export type {
  CEFRLevel,
  LearningGoal,
  LearnerProfile,
} from './profile.js'
export type {
  SkillDimension,
  TrendDirection,
  SkillState,
  LearnerSkillProfile,
} from './skills.js'
export type {
  LessonCompletion,
  FlashcardAttempt,
  QuizResult,
  ConversationSessionSummary,
  PronunciationAttempt,
  ListeningAttempt,
  ProgressSnapshot,
} from './progress.js'
export type {
  RecommendationType,
  RecommendationPriority,
  Recommendation,
  SessionRecommendationSet,
} from './recommendations.js'
export type {
  ActivityEventType,
  ActivityEvent,
} from './activity.js'
export type {
  DailyLearningPath,
  WeeklyLearningPath,
  SpacedRepetitionItem,
} from './learning-path.js'
export type {
  GetRecommendationsResponse,
  GetLearningPathResponse,
  GetSkillProfileResponse,
  PostActivityEventRequest,
  PostActivityEventResponse,
} from './api.js'
