'use client'

import { useSearchParams } from 'next/navigation'
import { LessonPlayer } from '@/features/lesson-player/LessonPlayer'

export function HousingServicesSchemaLessonClient() {
  const searchParams = useSearchParams()
  const lesson = searchParams.get('lesson')

  return <LessonPlayer initialLessonId={lesson ?? undefined} defaultModuleId="a2-m05-housing-services" />
}
