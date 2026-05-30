/**
 * Friction / guidance levels for Talk and speaking — persisted locally.
 */
import { persist } from 'zustand/middleware'
import { create } from 'zustand'

export type ConversationGuidanceMode = 'guided' | 'free'
export type FeedbackTimingMode = 'each_turn' | 'end' | 'silent'

export type GuidancePreferences = {
  conversationMode: ConversationGuidanceMode
  feedbackTiming: FeedbackTimingMode
  /** Exam-style stricter evaluation copy + timing */
  examStyleConversation: boolean
}

type GuidanceStore = GuidancePreferences & {
  setConversationMode: (m: ConversationGuidanceMode) => void
  setFeedbackTiming: (m: FeedbackTimingMode) => void
  setExamStyleConversation: (v: boolean) => void
}

export const useGuidancePreferences = create<GuidanceStore>()(
  persist(
    (set) => ({
      conversationMode: 'guided',
      feedbackTiming: 'end',
      examStyleConversation: false,
      setConversationMode: (conversationMode) => set({ conversationMode }),
      setFeedbackTiming: (feedbackTiming) => set({ feedbackTiming }),
      setExamStyleConversation: (examStyleConversation) => set({ examStyleConversation }),
    }),
    { name: 'fluent-guidance-prefs-v1' }
  )
)
