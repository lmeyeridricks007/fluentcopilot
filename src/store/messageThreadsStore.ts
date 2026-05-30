'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PracticeThreadMessage } from '@/features/practice-conversation'

export type PersistedChatPhase = 'intro' | 'chat' | 'complete'

export type MessageThreadRecord = {
  id: string
  scenarioId: string
  title: string
  mode: 'free' | 'semi_guided'
  updatedAt: string
  messages: PracticeThreadMessage[]
  phase: PersistedChatPhase
}

const MAX_THREADS = 20
const MAX_MSG = 100

type State = {
  threads: MessageThreadRecord[]
  createThread: (input: { scenarioId: string; title: string; mode: 'free' | 'semi_guided' }) => string
  getThread: (id: string) => MessageThreadRecord | undefined
  upsertThread: (patch: Partial<MessageThreadRecord> & { id: string }) => void
  removeThread: (id: string) => void
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `th-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useMessageThreadsStore = create<State>()(
  persist(
    (set, get) => ({
      threads: [],
      createThread: ({ scenarioId, title, mode }) => {
        const id = newId()
        const row: MessageThreadRecord = {
          id,
          scenarioId,
          title,
          mode,
          updatedAt: new Date().toISOString(),
          messages: [],
          phase: 'intro',
        }
        set((s) => ({
          threads: [row, ...s.threads.filter((t) => t.id !== id)].slice(0, MAX_THREADS),
        }))
        return id
      },
      getThread: (id) => get().threads.find((t) => t.id === id),
      upsertThread: (patch) => {
        set((s) => {
          const rest = s.threads.filter((t) => t.id !== patch.id)
          const prev = s.threads.find((t) => t.id === patch.id)
          const base = prev ?? {
            id: patch.id,
            scenarioId: patch.scenarioId ?? 'cafe',
            title: patch.title ?? 'Chat',
            mode: patch.mode ?? 'free',
            updatedAt: new Date().toISOString(),
            messages: [],
            phase: 'intro' as PersistedChatPhase,
          }
          const messages = patch.messages ?? base.messages
          const next: MessageThreadRecord = {
            ...base,
            ...patch,
            messages: messages.slice(-MAX_MSG),
            updatedAt: new Date().toISOString(),
          }
          return { threads: [next, ...rest].slice(0, MAX_THREADS) }
        })
      },
      removeThread: (id) => set((s) => ({ threads: s.threads.filter((t) => t.id !== id) })),
    }),
    { name: 'fc-message-threads-v1' }
  )
)
