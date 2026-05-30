'use client'

import { KnmSceneImage } from '@/features/exam-prep/kmn/illustrations/KnmSceneImage'
import { resolveKnmQuizSceneId } from '@/lib/exam-prep/kmn/knmSceneInference'
import type { KmnQuizQuestion } from '@/lib/exam-prep/kmn/types'

/** Situational photo for KMN topic quiz / practice-exam questions. */
export function KmnQuizQuestionMedia({
  question,
  className,
}: {
  question: Pick<KmnQuizQuestion, 'promptNl' | 'sceneId' | 'topicId'>
  className?: string
}) {
  const sceneId = resolveKnmQuizSceneId(question)
  return (
    <KnmSceneImage sceneId={sceneId} questionNl={question.promptNl} className={className} />
  )
}
