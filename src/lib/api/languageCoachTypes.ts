/** Mirrors backend `LanguageCoachStartBodySchema` for POST `/conversations/start`. */
export type LanguageCoachStartBody = {
  conversationGoal?: LanguageCoachConversationGoal
  feedbackStyle?: LanguageCoachFeedbackStyle
  coachStyle?: LanguageCoachStyle
  personaStyle?: LanguageCoachPersonaStyle
  /** Role mode — who you are talking to (tone + follow-up style). */
  conversationRole?: LanguageCoachConversationRole
  /**
   * Coach role only: mid-conversation phrasing help and faster rescue.
   * Ignored for other roles on the server.
   */
  coachGuideWhileSpeaking?: boolean
  /**
   * Optional English instruction seeded from the previous session's "Plan your next session"
   * deep-link. Backend writes it into `learnerPinnedLessonFocusEnglish`, which the coach
   * prompt builder weaves into every reply as a "Learner-pinned lesson spine". Length cap
   * is enforced server-side (320 chars); the producer already keeps it ≤220.
   */
  pinnedFocusEnglish?: string
}

export type LanguageCoachConversationGoal =
  | 'general'
  | 'fluency'
  | 'pronunciation'
  | 'grammar'
  | 'confidence'
  | 'storytelling'
  | 'follow_up_questions'

export type LanguageCoachFeedbackStyle = 'subtle_and_end' | 'at_end_only' | 'every_turn'

export type LanguageCoachStyle = 'supportive' | 'balanced' | 'challenging'

export type LanguageCoachPersonaStyle = 'local' | 'coach' | 'casual'

export type LanguageCoachConversationRole = 'friend' | 'colleague' | 'dutch_local' | 'date' | 'coach'
