'use client'

import { useSearchParams } from 'next/navigation'
import { LessonPlayer } from '@/features/lesson-player/LessonPlayer'

export function HealthDoctorSchemaLessonClient() {
  const searchParams = useSearchParams()
  const lesson = searchParams.get('lesson')

  return <LessonPlayer initialLessonId={lesson ?? undefined} defaultModuleId="a2-m06-health-doctor" />
}
