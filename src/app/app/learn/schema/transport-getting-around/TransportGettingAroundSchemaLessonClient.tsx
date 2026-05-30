'use client'

import { useSearchParams } from 'next/navigation'
import { LessonPlayer } from '@/features/lesson-player/LessonPlayer'

export function TransportGettingAroundSchemaLessonClient() {
  const searchParams = useSearchParams()
  const lesson = searchParams.get('lesson')

  return <LessonPlayer initialLessonId={lesson ?? undefined} defaultModuleId="a2-m07-transport-getting-around" />
}
