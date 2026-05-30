'use client'

import { useSearchParams } from 'next/navigation'
import { LessonPlayer } from '@/features/lesson-player/LessonPlayer'

export function UnexpectedSituationsProblemSolvingSchemaLessonClient() {
  const searchParams = useSearchParams()
  const lesson = searchParams.get('lesson')

  return (
    <LessonPlayer initialLessonId={lesson ?? undefined} defaultModuleId="a2-m10-unexpected-situations-problem-solving" />
  )
}
