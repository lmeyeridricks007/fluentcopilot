'use client'

import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { savedWordsClient } from '@/lib/api/savedWordsClient'
import { usePersonalLibraryStore } from '@/store/personalLibraryStore'
import type { ChatSavedLexemeMeta } from '../types'

function addToLibraryLocal(meta: ChatSavedLexemeMeta): void {
  usePersonalLibraryStore.getState().addWordFromChat({
    nl: meta.text.trim(),
    en: meta.meaning?.trim() ?? '',
    sourceScenarioId: meta.sourceScenarioId,
    sourceThreadId: meta.sourceThreadId,
    sourceMessageId: meta.sourceMessageId,
    sourceType: meta.sourceType,
    createdAt: meta.createdAt,
  })
}

/** Local-only / mock path — synchronous. */
export function saveLexemeFromChat(meta: ChatSavedLexemeMeta): void {
  addToLibraryLocal(meta)
}

/**
 * Saves via API when backend mode is on; otherwise updates Library store only.
 * Callers should `await` for loading/error UX when using the API.
 */
export async function saveLexemeFromChatAsync(meta: ChatSavedLexemeMeta): Promise<void> {
  if (!isFeature1ChatBackendEnabled()) {
    addToLibraryLocal(meta)
    return
  }

  const sourceType =
    meta.sourceType === 'chat_feedback'
      ? 'chat_feedback'
      : meta.sourceType === 'chat_ai'
        ? 'chat_ai'
        : 'chat_manual'

  const res = await savedWordsClient.saveWord({
    selectedText: meta.text.trim(),
    sourceThreadId: meta.sourceThreadId,
    sourceMessageId: meta.sourceMessageId,
    sourceScenarioId: meta.sourceScenarioId,
    meaning: meta.meaning?.trim() ?? null,
    sourceType,
  })

  usePersonalLibraryStore.getState().addWordFromChat({
    nl: res.item.text.trim(),
    en: res.item.meaning?.trim() ?? meta.meaning?.trim() ?? '',
    sourceScenarioId: meta.sourceScenarioId,
    sourceThreadId: meta.sourceThreadId,
    sourceMessageId: meta.sourceMessageId,
    sourceType: meta.sourceType === 'chat_feedback' ? 'chat_feedback' : 'chat_ai',
    createdAt: res.item.createdAt,
    backendWordId: res.item.id,
  })
}
