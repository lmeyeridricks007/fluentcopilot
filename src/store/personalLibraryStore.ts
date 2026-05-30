'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  CapturedMomentItem,
  PhotoCaptureItem,
  SavedPhraseItem,
  SavedPlaceItem,
  SavedWordItem,
} from '@/mocks/personalLibrarySeed'
import {
  SEED_CAPTURED_MOMENTS,
  SEED_PHOTOS,
  SEED_PLACES,
  SEED_SAVED_PHRASES,
  SEED_SAVED_WORDS,
} from '@/mocks/personalLibrarySeed'

export type QuickCaptureDraft =
  | { kind: 'word'; nl: string; en?: string }
  | { kind: 'phrase'; nl: string; en?: string }
  | { kind: 'moment'; title: string; detail: string }
  | { kind: 'place'; label: string; placeKind: SavedPlaceItem['kind'] }
  | { kind: 'problem'; text: string }

type AddWordFromChatInput = {
  nl: string
  en?: string
  sourceScenarioId: string
  sourceThreadId: string
  sourceMessageId: string
  sourceType: 'chat_ai' | 'chat_feedback' | 'chat_manual'
  createdAt: string
  /** When set (API save), use as Library id and skip duplicates. */
  backendWordId?: string
}

type PersonalLibraryState = {
  words: SavedWordItem[]
  phrases: SavedPhraseItem[]
  places: SavedPlaceItem[]
  moments: CapturedMomentItem[]
  photos: PhotoCaptureItem[]
  addWord: (nl: string, en?: string, memoryHint?: string) => void
  addWordFromChat: (input: AddWordFromChatInput) => void
  addPhrase: (nl: string, en?: string, context?: string) => void
  addPlace: (label: string, kind: SavedPlaceItem['kind']) => void
  addMoment: (title: string, detail: string) => void
  addPhotoLabel: (label: string, hint?: string) => void
  resetToSeed: () => void
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const uid = () => `u-${Math.random().toString(36).slice(2, 10)}`

function normalizeLibraryText(value: string): string {
  return value.trim().toLowerCase()
}

export const usePersonalLibraryStore = create<PersonalLibraryState>()(
  persist(
    (set) => ({
      words: [...SEED_SAVED_WORDS],
      phrases: [...SEED_SAVED_PHRASES],
      places: [...SEED_PLACES],
      moments: [...SEED_CAPTURED_MOMENTS],
      photos: [...SEED_PHOTOS],
      addWord: (nl, en, memoryHint) =>
        set((s) => {
          const cleaned = nl.trim()
          if (!cleaned) return s
          if (s.words.some((w) => normalizeLibraryText(w.nl) === normalizeLibraryText(cleaned))) return s
          const hint = memoryHint?.trim()
          return {
            words: [
              {
                id: uid(),
                nl: cleaned,
                en: en?.trim() ?? '',
                exampleNl: hint || undefined,
                savedAt: todayIso(),
                sourceType: 'manual',
              },
              ...s.words,
            ],
          }
        }),
      addWordFromChat: (input) =>
        set((s) => {
          if (
            input.backendWordId &&
            s.words.some((w) => w.id === input.backendWordId)
          ) {
            return s
          }
          return {
            words: [
              {
                id: input.backendWordId ?? uid(),
                nl: input.nl.trim(),
                en: input.en?.trim() ?? '',
                savedAt: input.createdAt.slice(0, 10),
                sourceScenarioId: input.sourceScenarioId,
                sourceThreadId: input.sourceThreadId,
                sourceMessageId: input.sourceMessageId,
                sourceType: input.sourceType,
              },
              ...s.words,
            ],
          }
        }),
      addPhrase: (nl, en, context) =>
        set((s) => {
          const cleaned = nl.trim()
          if (!cleaned) return s
          if (s.phrases.some((p) => normalizeLibraryText(p.nl) === normalizeLibraryText(cleaned))) return s
          return {
            phrases: [
              {
                id: uid(),
                nl: cleaned,
                en: en?.trim() ?? '',
                context: context?.trim() || undefined,
                savedAt: todayIso(),
              },
              ...s.phrases,
            ],
          }
        }),
      addPlace: (label, kind) =>
        set((s) => ({
          places: [{ id: uid(), label: label.trim(), kind, savedAt: todayIso() }, ...s.places],
        })),
      addMoment: (title, detail) =>
        set((s) => ({
          moments: [
            {
              id: uid(),
              title: title.trim(),
              detail: detail.trim(),
              savedAt: todayIso(),
              suggestedAction: 'chat',
            },
            ...s.moments,
          ],
        })),
      addPhotoLabel: (label, hint) =>
        set((s) => ({
          photos: [
            {
              id: uid(),
              label: label.trim(),
              extractedTextHint: hint,
              savedAt: todayIso(),
            },
            ...s.photos,
          ],
        })),
      resetToSeed: () =>
        set({
          words: [...SEED_SAVED_WORDS],
          phrases: [...SEED_SAVED_PHRASES],
          places: [...SEED_PLACES],
          moments: [...SEED_CAPTURED_MOMENTS],
          photos: [...SEED_PHOTOS],
        }),
    }),
    { name: 'fc-personal-library-v1' }
  )
)
