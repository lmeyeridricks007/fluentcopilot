'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import type { ExamTaskInstance } from '@/lib/exam-system/types'
import { mcqSubmissionMatchesCorrect } from '@/lib/exam-system/scoringEngine'
import {
  buildSavedKnmExamQuestionFromTask,
  isKnmExamQuestionSaved,
  KNM_SAVED_QUESTIONS_UPDATED_EVENT,
  removeSavedKnmExamQuestion,
  saveKnmExamQuestionFromTask,
  stableSavedKnmQuestionId,
  fingerprintKnmExamQuestion,
} from '@/lib/exam-prep/kmn/savedKnmExamQuestions'

export function KnmSaveExamQuestionButton(props: {
  task: ExamTaskInstance
  sessionId: string
  userAnswerText?: string
  className?: string
  compact?: boolean
}) {
  const { task, sessionId, userAnswerText, className, compact } = props
  const built = buildSavedKnmExamQuestionFromTask(task)
  const questionId = built?.id ?? stableSavedKnmQuestionId(fingerprintKnmExamQuestion(task))

  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const sync = useCallback(() => {
    setSaved(isKnmExamQuestionSaved(questionId))
  }, [questionId])

  useEffect(() => {
    sync()
    const onUpdate = () => sync()
    window.addEventListener(KNM_SAVED_QUESTIONS_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(KNM_SAVED_QUESTIONS_UPDATED_EVENT, onUpdate)
  }, [sync])

  const toggle = useCallback(() => {
    if (busy || !task.mcq?.options?.length) return
    setBusy(true)
    try {
      if (saved) {
        removeSavedKnmExamQuestion(questionId)
        setSaved(false)
      } else {
        const wasCorrect =
          userAnswerText?.trim() && task.mcq
            ? mcqSubmissionMatchesCorrect(task.mcq.correctOptionIds, userAnswerText.trim())
            : undefined
        saveKnmExamQuestionFromTask(task, {
          sessionId,
          userAnswerText,
          wasCorrect,
        })
        setSaved(true)
      }
    } finally {
      setBusy(false)
    }
  }, [busy, saved, task, sessionId, userAnswerText, questionId])

  if (!task.mcq?.options?.length || task.taskType !== 'knowledge_mcq') return null

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-xl border text-caption font-semibold transition-colors min-h-touch px-3 py-2',
        saved
          ? 'border-indigo-300 bg-indigo-50 text-indigo-950 hover:bg-indigo-100/80'
          : 'border-slate-200 bg-white text-ink-primary hover:border-indigo-200 hover:bg-indigo-50/40',
        compact && 'min-h-0 py-1.5 px-2.5 text-[11px]',
        className,
      )}
      aria-pressed={saved}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin" aria-hidden />
      ) : saved ? (
        <BookmarkCheck className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <Bookmark className="h-4 w-4 shrink-0" aria-hidden />
      )}
      {saved ? 'Saved for review' : 'Save for review'}
    </button>
  )
}
