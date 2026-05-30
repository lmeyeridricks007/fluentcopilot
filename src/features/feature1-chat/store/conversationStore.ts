'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import { getPersona } from '../mock/mockPersonas'
import { getScenario, TRAIN_STATION_SCENARIO_ID } from '../mock/mockScenarioConfigs'
import {
  buildThreadSummary,
  deferFeedbackForEnd,
  runMockEngineTurn,
} from '../services/mockConversationEngine'
import type { UserMessageInputMeta } from '@/lib/conversation/userMessageInputMeta'
import type {
  ChatMessage,
  ConversationMode,
  ConversationStage,
  ConversationThread,
  FeedbackItem,
  FeedbackMode,
} from '../types'
import { newMessageId, newThreadId } from './conversationIds'

type UserSlice = {
  threads: ConversationThread[]
}

export type Feature1ConversationStoreState = {
  byUserId: Record<string, UserSlice>
  createTrainStationThread: (opts: { mode: ConversationMode; feedbackMode: FeedbackMode }) => string
  getThread: (threadId: string) => ConversationThread | undefined
  getActiveTrainStationThread: () => ConversationThread | undefined
  getPausedTrainStationThreads: () => ConversationThread[]
  getRecentCompletedTrainThreads: (limit?: number) => ConversationThread[]
  sendUserMessage: (threadId: string, text: string, inputMeta?: UserMessageInputMeta) => void
  dismissContext: (threadId: string) => void
  pauseTrainThread: (threadId: string) => void
  resumeTrainThread: (threadId: string) => void
  endThread: (threadId: string) => void
  /** Replace summary after recap navigation */
  clearThreadSummary: (threadId: string) => void
}

type State = Feature1ConversationStoreState

function currentUserId(): string {
  return useAuthStore.getState().user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID
}

function isoNow(): string {
  return new Date().toISOString()
}

function mergeStages(thread: ConversationThread, next: ConversationStage): ConversationStage[] {
  const prev: ConversationStage[] = thread.stagesReached?.length ? thread.stagesReached : ['opening']
  return Array.from(new Set<ConversationStage>([...prev, thread.currentStage, next]))
}

function emptySlice(): UserSlice {
  return { threads: [] }
}

export const useFeature1ConversationStore = create<State>()(
  persist(
    (set, get) => ({
      byUserId: {},

      getThread: (threadId) => {
        const uid = currentUserId()
        return get().byUserId[uid]?.threads.find((t) => t.id === threadId)
      },

      getActiveTrainStationThread: () => {
        const uid = currentUserId()
        return get().byUserId[uid]?.threads.find(
          (t) => t.scenarioId === TRAIN_STATION_SCENARIO_ID && t.status === 'active'
        )
      },

      getPausedTrainStationThreads: () => {
        const uid = currentUserId()
        const list = get().byUserId[uid]?.threads ?? []
        return list
          .filter((t) => t.scenarioId === TRAIN_STATION_SCENARIO_ID && t.status === 'paused')
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      },

      getRecentCompletedTrainThreads: (limit = 3) => {
        const uid = currentUserId()
        const list = get().byUserId[uid]?.threads ?? []
        return list
          .filter((t) => t.scenarioId === TRAIN_STATION_SCENARIO_ID && t.status === 'completed')
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, limit)
      },

      createTrainStationThread: ({ mode, feedbackMode }) => {
        const uid = currentUserId()
        const id = newThreadId()
        const scenario = getScenario(TRAIN_STATION_SCENARIO_ID)
        const persona = getPersona(scenario.personaId)
        const now = isoNow()

        const intro: ChatMessage = {
          id: newMessageId(),
          threadId: id,
          sender: 'ai',
          content: persona.introLine,
          createdAt: now,
          type: 'text',
        }

        const thread: ConversationThread = {
          id,
          scenarioId: scenario.id,
          personaId: persona.id,
          mode,
          conversationSurface: 'text',
          feedbackMode,
          status: 'active',
          summary: null,
          currentStage: 'opening',
          messages: [intro],
          pendingFeedback: [],
          assistantTyping: false,
          contextDismissed: false,
          stagesReached: ['opening'] satisfies ConversationStage[],
          createdAt: now,
          updatedAt: now,
        }

        set((s) => {
          const prev = s.byUserId[uid] ?? emptySlice()
          const paused = prev.threads.map((t) =>
            t.scenarioId === TRAIN_STATION_SCENARIO_ID && t.status === 'active'
              ? { ...t, status: 'paused' as const, updatedAt: isoNow() }
              : t
          )
          return {
            byUserId: {
              ...s.byUserId,
              [uid]: { threads: [thread, ...paused] },
            },
          }
        })

        return id
      },

      sendUserMessage: (threadId, text, inputMeta) => {
        const uid = currentUserId()
        const trimmed = text.trim()
        if (!trimmed) return

        let userMessageId = ''

        set((s) => {
          const slice = s.byUserId[uid] ?? emptySlice()
          const threads = slice.threads.map((t) => {
            if (t.id !== threadId || t.status !== 'active') return t
            userMessageId = newMessageId()
            const meta =
              inputMeta &&
              (inputMeta.inputMode || inputMeta.originalTranscript != null || inputMeta.audioReference != null)
                ? {
                    ...(inputMeta.inputMode ? { inputMode: inputMeta.inputMode } : {}),
                    ...(inputMeta.originalTranscript != null
                      ? { originalTranscript: inputMeta.originalTranscript }
                      : {}),
                    ...(inputMeta.audioReference != null ? { audioReference: inputMeta.audioReference } : {}),
                  }
                : undefined
            const userMsg: ChatMessage = {
              id: userMessageId,
              threadId,
              sender: 'user',
              content: trimmed,
              createdAt: isoNow(),
              type: 'text',
              metadata: meta && Object.keys(meta).length > 0 ? meta : undefined,
            }
            return {
              ...t,
              messages: [...t.messages, userMsg],
              assistantTyping: true,
              updatedAt: isoNow(),
            }
          })
          return { byUserId: { ...s.byUserId, [uid]: { threads } } }
        })

        if (!userMessageId) return

        const delayMs = 700 + Math.floor(Math.random() * 650)
        if (typeof window === 'undefined') return

        window.setTimeout(() => {
          const st = get()
          const slice = st.byUserId[uid] ?? emptySlice()
          const thread = slice.threads.find((x) => x.id === threadId)
          if (!thread || thread.status !== 'active') return

          const scenario = getScenario(thread.scenarioId)
          const persona = getPersona(thread.personaId)

          const engineInput = { thread, userText: trimmed, scenario, persona }
          const turn = runMockEngineTurn(engineInput, userMessageId)

          let extraFeedback: FeedbackItem | null = null
          if (thread.feedbackMode === 'at_end') {
            extraFeedback = deferFeedbackForEnd(engineInput, userMessageId)
          }

          const pendingFeedback = [...thread.pendingFeedback]
          if (turn.feedback) pendingFeedback.push(turn.feedback)
          if (extraFeedback) pendingFeedback.push(extraFeedback)

          const stagesReached = mergeStages(thread, turn.nextStage)

          const aiMsg: ChatMessage = {
            id: newMessageId(),
            threadId,
            sender: 'ai',
            content: turn.assistantMessage,
            createdAt: isoNow(),
            type: 'text',
            metadata: {
              intent: turn.detectedIntent,
              translationHint: turn.assistantTranslationHint,
            },
          }

          set((s) => {
            const sl = s.byUserId[uid] ?? emptySlice()
            const threads = sl.threads.map((t) => {
              if (t.id !== threadId) return t
              return {
                ...t,
                messages: [...t.messages, aiMsg],
                assistantTyping: false,
                currentStage: turn.nextStage,
                pendingFeedback,
                stagesReached,
                updatedAt: isoNow(),
              }
            })
            return { byUserId: { ...s.byUserId, [uid]: { threads } } }
          })
        }, delayMs)
      },

      dismissContext: (threadId) => {
        const uid = currentUserId()
        set((s) => {
          const slice = s.byUserId[uid] ?? emptySlice()
          const threads = slice.threads.map((t) =>
            t.id === threadId ? { ...t, contextDismissed: true, updatedAt: isoNow() } : t
          )
          return { byUserId: { ...s.byUserId, [uid]: { threads } } }
        })
      },

      pauseTrainThread: (threadId) => {
        const uid = currentUserId()
        set((s) => {
          const slice = s.byUserId[uid] ?? emptySlice()
          const threads = slice.threads.map((t) =>
            t.id === threadId && t.status === 'active'
              ? { ...t, status: 'paused' as const, assistantTyping: false, updatedAt: isoNow() }
              : t
          )
          return { byUserId: { ...s.byUserId, [uid]: { threads } } }
        })
      },

      resumeTrainThread: (threadId) => {
        const uid = currentUserId()
        set((s) => {
          const slice = s.byUserId[uid] ?? emptySlice()
          const threads = slice.threads.map((t) => {
            if (t.scenarioId !== TRAIN_STATION_SCENARIO_ID) return t
            if (t.id === threadId && t.status === 'paused') {
              return { ...t, status: 'active' as const, updatedAt: isoNow() }
            }
            if (t.status === 'active') {
              return { ...t, status: 'paused' as const, assistantTyping: false, updatedAt: isoNow() }
            }
            return t
          })
          return { byUserId: { ...s.byUserId, [uid]: { threads } } }
        })
      },

      endThread: (threadId) => {
        const uid = currentUserId()
        set((s) => {
          const slice = s.byUserId[uid] ?? emptySlice()
          const threads = slice.threads.map((t) => {
            if (t.id !== threadId) return t
            const scenario = getScenario(t.scenarioId)
            const lastAi = [...t.messages].reverse().find((m) => m.sender === 'ai')
            const summary = buildThreadSummary({
              threadId: t.id,
              scenarioTitle: scenario.title,
              stagesVisited: new Set(t.stagesReached ?? ['opening']),
              pendingFeedback: t.pendingFeedback,
              lastAssistantSnippet: lastAi?.content,
            })
            return {
              ...t,
              status: 'completed' as const,
              summary,
              assistantTyping: false,
              updatedAt: isoNow(),
            }
          })
          return { byUserId: { ...s.byUserId, [uid]: { threads } } }
        })
      },

      clearThreadSummary: (threadId) => {
        const uid = currentUserId()
        set((s) => {
          const slice = s.byUserId[uid] ?? emptySlice()
          const threads = slice.threads.map((t) =>
            t.id === threadId ? { ...t, summary: null } : t
          )
          return { byUserId: { ...s.byUserId, [uid]: { threads } } }
        })
      },
    }),
    { name: 'fc-feature1-chat-v1' }
  )
)
