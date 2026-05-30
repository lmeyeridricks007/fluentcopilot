/**
 * Lightweight client persistence so Practice Hub can echo the last exam next-steps.
 */
import type { NextBestAction } from '@/lib/schemas/exam/feedbackBlock.schema'

const KEY = 'exam_last_next_actions_v1'

export type LastExamNextActionsPayload = {
  actions: NextBestAction[]
  examType: string
  mode?: string
  savedAt: number
}

export function persistLastExamNextActions(payload: Omit<LastExamNextActionsPayload, 'savedAt'>): void {
  if (typeof window === 'undefined' || payload.actions.length === 0) return
  try {
    const row: LastExamNextActionsPayload = { ...payload, savedAt: Date.now() }
    sessionStorage.setItem(KEY, JSON.stringify(row))
  } catch {
    /* ignore quota */
  }
}

export function loadLastExamNextActions(): LastExamNextActionsPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as LastExamNextActionsPayload
  } catch {
    return null
  }
}
