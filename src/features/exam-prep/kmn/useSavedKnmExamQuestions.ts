'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  KNM_SAVED_QUESTIONS_UPDATED_EVENT,
  readSavedKnmExamQuestions,
  type SavedKnmExamQuestion,
} from '@/lib/exam-prep/kmn/savedKnmExamQuestions'

export function useSavedKnmExamQuestions(): SavedKnmExamQuestion[] {
  const [items, setItems] = useState<SavedKnmExamQuestion[]>([])

  const refresh = useCallback(() => {
    setItems(readSavedKnmExamQuestions())
  }, [])

  useEffect(() => {
    refresh()
    const onUpdate = () => refresh()
    window.addEventListener(KNM_SAVED_QUESTIONS_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(KNM_SAVED_QUESTIONS_UPDATED_EVENT, onUpdate)
  }, [refresh])

  return items
}
