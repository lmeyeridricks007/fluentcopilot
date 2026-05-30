'use client'

import { KnmSceneImage } from '@/features/exam-prep/kmn/illustrations/KnmSceneImage'
import type { KnmA2ExamCategory } from '@/lib/exam-system/a2KnmExamBank'

/** KNM exam stem visual: realistic situational photo matching the question text. */
export function KnmExamQuestionMedia(props: {
  illustrationId?: string | null
  questionImageUrl?: string | null
  questionNl?: string | null
  category?: KnmA2ExamCategory
  className?: string
}) {
  const { illustrationId, questionImageUrl, questionNl, category, className } = props
  if (!illustrationId?.trim() && !questionImageUrl?.trim() && !questionNl?.trim()) return null

  return (
    <KnmSceneImage
      illustrationId={illustrationId}
      questionImageUrl={questionImageUrl}
      questionNl={questionNl}
      category={category}
      className={className}
    />
  )
}
